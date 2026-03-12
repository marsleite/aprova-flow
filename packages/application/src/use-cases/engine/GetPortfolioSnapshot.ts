import type { PortfolioSnapshotV1 } from '@aprovamind/contracts/engine/PortfolioSnapshot';
import type {
    EngineDataSource,
    EngineQueryWindow,
} from '@aprovamind/application/ports/EngineDataSource';
import {
    DEFAULT_ENGINE_POLICY,
    type EnginePolicy,
} from '@aprovamind/domain/policies/engine-policy';
import { computePortfolio } from '@aprovamind/domain/services/PortfolioAllocator';

export interface GetPortfolioSnapshotInput {
    userId: string;
    today: string;
    globalWeeklyBudget: number;
    window?: Partial<EngineQueryWindow>;
}

export type GetPortfolioSnapshotResult =
    | {
        found: true;
        snapshot: PortfolioSnapshotV1;
    }
    | {
        found: false;
        reason: string;
    };

function shiftIsoDate(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    utcDate.setUTCDate(utcDate.getUTCDate() + days);
    return utcDate.toISOString().slice(0, 10);
}

function buildDefaultWindow(
    today: string,
    policy: EnginePolicy
): EngineQueryWindow {
    const recentStudyDays = Math.max(
        policy.health.windows.rollingVolumeDays,
        policy.health.windows.rollingFrequencyDays,
        policy.health.windows.noDataDays
    );
    const recentQuestionDays = Math.max(
        policy.health.windows.rollingPerformanceDays,
        policy.health.windows.noDataDays
    );

    return {
        studySessionsFrom: shiftIsoDate(today, -(recentStudyDays - 1)),
        questionSessionsFrom: shiftIsoDate(today, -(recentQuestionDays - 1)),
        allTimeStudySessionsFrom: '1900-01-01',
        allTimeQuestionSessionsFrom: '1900-01-01',
    };
}

export class GetPortfolioSnapshot {
    constructor(
        private readonly dataSource: EngineDataSource,
        private readonly policy: EnginePolicy = DEFAULT_ENGINE_POLICY
    ) { }

    async execute(
        input: GetPortfolioSnapshotInput
    ): Promise<GetPortfolioSnapshotResult> {
        const defaultWindow = buildDefaultWindow(input.today, this.policy);

        // Fetch all active plan contexts for this user
        const loaded = await this.dataSource.loadAllPlanEngineContexts({
            userId: input.userId,
            today: input.today,
            window: {
                ...defaultWindow,
                ...input.window,
            },
        });

        if (!loaded.found) {
            return { found: false, reason: 'failed_to_load_contexts' };
        }

        // Extract plans and map contexts by planId
        const plans = [];
        const planContexts = new Map();

        for (const ctx of loaded.contexts) {
            plans.push(ctx.plan);
            planContexts.set(ctx.plan.planId, ctx);
        }

        if (plans.length === 0) {
            return { found: false, reason: 'no_plans_found' };
        }

        // Run the domain allocator
        const portfolio = computePortfolio({
            globalWeeklyBudget: input.globalWeeklyBudget,
            today: input.today,
            plans,
            planContexts,
        });

        // Map Domain Result to DTO
        const snapshot: PortfolioSnapshotV1 = {
            engineVersion: '1.0.0', // Fixed version for now
            userId: input.userId,
            globalWeeklyBudget: portfolio.globalWeeklyBudget,
            computedAt: portfolio.computedAt,
            plans: portfolio.plans.map(p => ({
                planId: p.planId,
                planName: p.planName,
                color: p.color,
                riskScore: p.riskScore,
                urgencyScore: p.urgencyScore,
                healthScore: p.healthScore,
                userPriority: p.userPriority,
                compositeScore: p.compositeScore,
                allocatedPercent: p.allocatedPercent,
                allocatedHours: p.allocatedHours,
                phase: p.phase,
                daysToExam: p.daysToExam,
                subjectHealthSummary: p.subjectHealthSummary,
            })),
            sharedSubjects: portfolio.sharedSubjects.map(s => ({
                subject: s.subject,
                planIds: s.planIds,
                maxWeight: s.maxWeight,
                avgWeight: s.avgWeight,
                bonusFactor: s.bonusFactor,
            })),
            alerts: portfolio.alerts.map(a => ({
                type: a.type,
                severity: a.severity,
                message: a.message,
                relatedPlanIds: a.relatedPlanIds,
            })),
            kpis: {
                budgetAdherencePercent: portfolio.kpis.budgetAdherencePercent,
                dispersionIndex: portfolio.kpis.dispersionIndex,
                sharingEfficiencyPercent: portfolio.kpis.sharingEfficiencyPercent,
                plansAtRisk: portfolio.kpis.plansAtRisk,
            },
        };

        return {
            found: true,
            snapshot,
        };
    }
}
