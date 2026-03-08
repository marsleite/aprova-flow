/**
 * PortfolioAllocator — AprovaMind Decision Engine
 *
 * Cross-plan prioritization: computes how to distribute the global
 * weekly budget across multiple study plans (editais).
 *
 * Business Rules Reference: Multi-Edital §3, §4, §5
 */

import { ExamPhase, SubjectHealthStatus } from '../enums';
import type {
    PlanRanking,
    PlanPortfolio,
    SharedSubject,
    PortfolioAlert,
    PortfolioKPIs,
    SubjectHealth,
    PlanInput,
    PortfolioEngineContext,
} from '../types';
import { computeUrgency, computeUrgencyFactor, clampScore } from '../value-objects';
import { computeAllSubjectHealth } from './SubjectHealthComputer';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Minimum allocation per plan (% of budget) */
const MIN_ALLOCATION_PERCENT = 10;
/** Maximum allocation per plan (% of budget) unless it's the only plan or final_push */
const MAX_ALLOCATION_PERCENT = 70;
/** Hours per plan below which dispersion is flagged */
const DISPERSION_THRESHOLD_HOURS = 5;
/** Bonus factor per additional plan sharing a subject. Capped at 2.0 */
const SHARED_BONUS_PER_PLAN = 0.15;
const SHARED_BONUS_CAP = 2.0;

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Computes the full portfolio view: rankings, allocations, shared subjects, alerts, KPIs.
 */
export function computePortfolio(ctx: PortfolioEngineContext): PlanPortfolio {
    const { plans, planContexts, globalWeeklyBudget, today } = ctx;

    // 1. Compute SubjectHealth for each plan
    const healthByPlan = new Map<string, SubjectHealth[]>();
    for (const plan of plans) {
        const planCtx = planContexts.get(plan.planId);
        if (planCtx) {
            healthByPlan.set(plan.planId, computeAllSubjectHealth(planCtx));
        }
    }

    // 2. Compute PlanRanking for each plan
    const rankings = plans.map((plan) => {
        const health = healthByPlan.get(plan.planId) ?? [];
        return computePlanRanking(plan, health, today);
    });

    // 3. Allocate budget
    allocateBudget(rankings, globalWeeklyBudget);

    // 4. Detect shared subjects
    const sharedSubjects = detectSharedSubjects(plans);

    // 5. Generate portfolio alerts
    const alerts = generatePortfolioAlerts(rankings, globalWeeklyBudget, plans.length);

    // 6. Compute KPIs
    const kpis = computeKPIs(rankings, globalWeeklyBudget, sharedSubjects);

    // Sort rankings by compositeScore desc
    rankings.sort((a, b) => b.compositeScore - a.compositeScore);

    return {
        userId: '', // filled by the application layer
        plans: rankings,
        globalWeeklyBudget,
        sharedSubjects,
        alerts,
        kpis,
        computedAt: new Date().toISOString(),
    };
}

/**
 * Compute the credit sharing bonus factor for a subject that appears in N plans.
 * bonusFactor = 1.0 + (0.15 × (N - 1)), capped at 2.0
 */
export function computeBonusFactor(planCount: number): number {
    if (planCount <= 1) return 1.0;
    return Math.min(SHARED_BONUS_CAP, 1.0 + SHARED_BONUS_PER_PLAN * (planCount - 1));
}

/**
 * Compute credited minutes for a shared subject session.
 * @param sessionMinutes - actual session duration
 * @param creditRate - 0.0 to 1.0, default 0.7
 */
export function computeCreditedMinutes(
    sessionMinutes: number,
    creditRate: number = 0.7,
): number {
    return Math.round(sessionMinutes * creditRate);
}

// ─────────────────────────────────────────────
// Plan Ranking
// ─────────────────────────────────────────────

function computePlanRanking(
    plan: PlanInput,
    health: SubjectHealth[],
    today: string,
): PlanRanking {
    // ── Days to exam ──
    let daysToExam: number | null = null;
    if (plan.examDate) {
        const examMs = new Date(plan.examDate).getTime();
        const todayMs = new Date(today).getTime();
        daysToExam = Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24));
    }

    const { phase } = computeUrgency(daysToExam);

    // ── Health Score (average of effort scores weighted by subject weight) ──
    const totalWeight = health.reduce((s, h) => s + h.weight, 0);
    const healthScore = totalWeight > 0
        ? health.reduce((s, h) => s + h.metrics.volumeScore * (h.weight / totalWeight), 0)
        : 50; // default when no subjects

    // ── Subject health summary ──
    const subjectHealthSummary = {
        healthy: health.filter((h) => h.status === SubjectHealthStatus.Healthy).length,
        mature: health.filter((h) => h.status === SubjectHealthStatus.Mature).length,
        warning: health.filter((h) => h.status === SubjectHealthStatus.Warning).length,
        critical: health.filter((h) => h.status === SubjectHealthStatus.Critical).length,
        neglected: health.filter((h) => h.status === SubjectHealthStatus.Neglected).length,
        inefficient: health.filter((h) => h.status === SubjectHealthStatus.Inefficient).length,
        blind_spot: health.filter((h) => h.status === SubjectHealthStatus.BlindSpot).length,
        no_data: health.filter((h) => h.status === SubjectHealthStatus.NoData).length,
    };

    // ── Composite Score ──
    const urgencyFactor = computeUrgencyFactor(daysToExam);
    const riskFactor = clampScore(100 - healthScore);
    const userPriorityFactor = (6 - plan.userPriority) * 20; // 1→100, 5→20
    const overallCompletion = health.length > 0
        ? health.reduce((s, h) => s + h.metrics.overallScore, 0) / health.length
        : 50;
    const healthDeficit = Math.max(0, 100 - overallCompletion);
    const criticalProportion = health.length > 0
        ? ((subjectHealthSummary.critical + subjectHealthSummary.neglected) / health.length) * 100
        : 0;

    const compositeScore = clampScore(
        urgencyFactor * 0.35 +
        riskFactor * 0.25 +
        userPriorityFactor * 0.20 +
        healthDeficit * 0.15 +
        criticalProportion * 0.05,
    );

    return {
        planId: plan.planId,
        planName: plan.name,
        color: plan.color,
        riskScore: clampScore(riskFactor),
        urgencyScore: clampScore(urgencyFactor),
        healthScore: clampScore(healthScore),
        userPriority: plan.userPriority,
        compositeScore,
        allocatedPercent: 0, // filled by allocateBudget
        allocatedHours: 0,   // filled by allocateBudget
        phase,
        daysToExam,
        subjectHealthSummary,
    };
}

// ─────────────────────────────────────────────
// Budget Allocation
// ─────────────────────────────────────────────

/**
 * Mutates rankings in-place to set allocatedPercent and allocatedHours.
 * Proportional to compositeScore with min/max constraints.
 */
function allocateBudget(rankings: PlanRanking[], globalBudget: number): void {
    if (rankings.length === 0) return;

    if (rankings.length === 1) {
        rankings[0].allocatedPercent = 100;
        rankings[0].allocatedHours = globalBudget;
        return;
    }

    const totalComposite = rankings.reduce((s, r) => s + r.compositeScore, 0);
    if (totalComposite === 0) {
        // Equal distribution fallback
        const equalPercent = 100 / rankings.length;
        for (const r of rankings) {
            r.allocatedPercent = equalPercent;
            r.allocatedHours = (equalPercent / 100) * globalBudget;
        }
        return;
    }

    // Initial proportional allocation
    for (const r of rankings) {
        r.allocatedPercent = (r.compositeScore / totalComposite) * 100;
    }

    // Apply constraints: min 10%, max 70% (unless final_push)
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
        changed = false;
        iterations++;

        let excess = 0;
        let flexCount = 0;

        for (const r of rankings) {
            const maxPercent = r.phase === ExamPhase.FinalPush ? 90 : MAX_ALLOCATION_PERCENT;

            if (r.allocatedPercent < MIN_ALLOCATION_PERCENT) {
                excess += MIN_ALLOCATION_PERCENT - r.allocatedPercent;
                r.allocatedPercent = MIN_ALLOCATION_PERCENT;
                changed = true;
            } else if (r.allocatedPercent > maxPercent) {
                excess -= r.allocatedPercent - maxPercent;
                r.allocatedPercent = maxPercent;
                changed = true;
            } else {
                flexCount++;
            }
        }

        // Redistribute excess among unconstrained plans
        if (excess !== 0 && flexCount > 0) {
            const adjustment = excess / flexCount;
            for (const r of rankings) {
                const maxPercent = r.phase === ExamPhase.FinalPush ? 90 : MAX_ALLOCATION_PERCENT;
                if (r.allocatedPercent > MIN_ALLOCATION_PERCENT && r.allocatedPercent < maxPercent) {
                    r.allocatedPercent -= adjustment;
                }
            }
        }
    }

    // Normalize to exactly 100%
    const totalPercent = rankings.reduce((s, r) => s + r.allocatedPercent, 0);
    if (totalPercent !== 100) {
        const factor = 100 / totalPercent;
        for (const r of rankings) {
            r.allocatedPercent *= factor;
        }
    }

    // Compute hours
    for (const r of rankings) {
        r.allocatedPercent = Math.round(r.allocatedPercent * 10) / 10; // 1 decimal
        r.allocatedHours = Math.round((r.allocatedPercent / 100) * globalBudget * 10) / 10;
    }
}

// ─────────────────────────────────────────────
// Shared Subjects
// ─────────────────────────────────────────────

function detectSharedSubjects(plans: PlanInput[]): SharedSubject[] {
    const subjectMap = new Map<string, { planIds: string[]; weights: number[] }>();

    for (const plan of plans) {
        for (const sp of plan.subjects) {
            const normalized = normalizeSubjectName(sp.subject);
            const entry = subjectMap.get(normalized) ?? { planIds: [], weights: [] };
            entry.planIds.push(plan.planId);
            entry.weights.push(sp.weight);
            subjectMap.set(normalized, entry);
        }
    }

    const shared: SharedSubject[] = [];
    for (const [subject, { planIds, weights }] of subjectMap) {
        if (planIds.length > 1) {
            shared.push({
                subject,
                planIds,
                maxWeight: Math.max(...weights),
                avgWeight: weights.reduce((a, b) => a + b, 0) / weights.length,
                bonusFactor: computeBonusFactor(planIds.length),
            });
        }
    }

    return shared.sort((a, b) => b.bonusFactor - a.bonusFactor);
}

/**
 * Normalizes subject names for comparison across plans.
 * "Direito Constitucional", "D. Constitucional", "DIREITO CONSTITUCIONAL" → same key.
 */
function normalizeSubjectName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/^d\.\s*/i, 'direito ')
        .replace(/^dir\.\s*/i, 'direito ')
        .replace(/\s+/g, ' ');
}

// ─────────────────────────────────────────────
// Portfolio Alerts
// ─────────────────────────────────────────────

function generatePortfolioAlerts(
    rankings: PlanRanking[],
    globalBudget: number,
    planCount: number,
): PortfolioAlert[] {
    const alerts: PortfolioAlert[] = [];

    // Dispersion alert
    const hoursPerPlan = globalBudget / planCount;
    if (planCount > 1 && hoursPerPlan < DISPERSION_THRESHOLD_HOURS) {
        alerts.push({
            type: 'dispersion',
            severity: 'warning',
            message: `Dispersão detectada: ${planCount} editais ativos com ${globalBudget}h/semana resulta em ~${hoursPerPlan.toFixed(1)}h por edital. Considere congelar editais de menor prioridade.`,
            relatedPlanIds: rankings.map((r) => r.planId),
        });
    }

    // Plans at risk
    for (const r of rankings) {
        if (r.riskScore > 60) {
            alerts.push({
                type: 'plan_at_risk',
                severity: r.riskScore > 80 ? 'critical' : 'warning',
                message: `${r.planName} está em risco (score ${r.riskScore}). ${r.subjectHealthSummary.critical + r.subjectHealthSummary.neglected} matérias precisam de atenção.`,
                relatedPlanIds: [r.planId],
            });
        }
    }

    // Exam passed
    for (const r of rankings) {
        if (r.phase === ExamPhase.PostExam) {
            alerts.push({
                type: 'exam_passed',
                severity: 'info',
                message: `A prova de ${r.planName} já aconteceu. Deseja arquivar este plano?`,
                relatedPlanIds: [r.planId],
            });
        }
    }

    // Budget exceeded (total plan goals > global budget)
    const totalGoalHours = rankings.reduce((s, r) => s + r.allocatedHours, 0);
    if (totalGoalHours > globalBudget * 1.1) {
        alerts.push({
            type: 'budget_exceeded',
            severity: 'warning',
            message: `A soma das alocações (${totalGoalHours.toFixed(1)}h) excede o orçamento global (${globalBudget}h). Ajuste suas prioridades.`,
            relatedPlanIds: rankings.map((r) => r.planId),
        });
    }

    return alerts;
}

// ─────────────────────────────────────────────
// Portfolio KPIs
// ─────────────────────────────────────────────

function computeKPIs(
    rankings: PlanRanking[],
    globalBudget: number,
    sharedSubjects: SharedSubject[],
): PortfolioKPIs {
    const plansAtRisk = rankings.filter((r) => r.riskScore > 60).length;

    // Budget adherence — would need actual hours from sessions to compute accurately.
    // For now, use health scores as a proxy.
    const avgHealth = rankings.length > 0
        ? rankings.reduce((s, r) => s + r.healthScore, 0) / rankings.length
        : 0;

    // Dispersion index: 1 - (stddev / mean) of allocatedPercent, higher = more balanced
    const percents = rankings.map((r) => r.allocatedPercent);
    const mean = percents.length > 0 ? percents.reduce((a, b) => a + b, 0) / percents.length : 0;
    const variance = percents.length > 0
        ? percents.reduce((s, p) => s + (p - mean) ** 2, 0) / percents.length
        : 0;
    const stddev = Math.sqrt(variance);
    const dispersionIndex = mean > 0 ? clampScore((1 - stddev / mean) * 100) : 100;

    // Sharing efficiency — % of subjects that are shared
    const totalSubjects = rankings.reduce(
        (s, r) => s + Object.values(r.subjectHealthSummary).reduce((a, b) => a + b, 0),
        0,
    );
    const sharedCount = sharedSubjects.reduce((s, ss) => s + ss.planIds.length, 0);
    const sharingEfficiency = totalSubjects > 0
        ? clampScore((sharedCount / totalSubjects) * 100)
        : 0;

    return {
        budgetAdherencePercent: clampScore(avgHealth),
        dispersionIndex,
        sharingEfficiencyPercent: sharingEfficiency,
        plansAtRisk,
    };
}
