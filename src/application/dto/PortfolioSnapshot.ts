import type { ExamPhase } from '@/domain/enums';

export type PortfolioAlertType = 'dispersion' | 'imbalance' | 'plan_at_risk' | 'exam_passed' | 'budget_exceeded';
export type PortfolioAlertSeverity = 'info' | 'warning' | 'critical';

export interface PortfolioSnapshotV1 {
    engineVersion: string;
    userId: string;
    globalWeeklyBudget: number;
    computedAt: string;
    plans: PortfolioPlanRankingSnapshotV1[];
    sharedSubjects: PortfolioSharedSubjectSnapshotV1[];
    alerts: PortfolioAlertSnapshotV1[];
    kpis: PortfolioKPIsSnapshotV1;
}

export interface PortfolioPlanRankingSnapshotV1 {
    planId: string;
    planName: string;
    color: string;
    riskScore: number;
    urgencyScore: number;
    healthScore: number;
    userPriority: number;
    compositeScore: number;
    allocatedPercent: number;
    allocatedHours: number;
    phase: ExamPhase;
    daysToExam: number | null;
    subjectHealthSummary: {
        healthy: number;
        mature: number;
        warning: number;
        critical: number;
        neglected: number;
        inefficient: number;
        blind_spot: number;
        no_data: number;
    };
}

export interface PortfolioSharedSubjectSnapshotV1 {
    subject: string;
    planIds: string[];
    maxWeight: number;
    avgWeight: number;
    bonusFactor: number;
}

export interface PortfolioAlertSnapshotV1 {
    type: PortfolioAlertType;
    severity: PortfolioAlertSeverity;
    message: string;
    relatedPlanIds: string[];
}

export interface PortfolioKPIsSnapshotV1 {
    budgetAdherencePercent: number;
    dispersionIndex: number;
    sharingEfficiencyPercent: number;
    plansAtRisk: number;
}
