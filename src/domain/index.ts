/**
 * AprovaMind Domain Layer
 *
 * Pure domain model for the Decision Engine.
 * No Firestore, no UI, no framework dependencies.
 *
 * Usage:
 *   import { StrategicState, computeAllSubjectHealth, ... } from '@/domain';
 */

// ── Enums ──
export {
    SubjectHealthStatus,
    SubjectStrategicState,
    STRATEGIC_STATE_SEVERITY,
    RecommendationType,
    RecommendationUrgency,
    PriorityBand,
    ExamPhase,
    AccuracyTrend,
    RecommendationCategory,
} from './enums';

// ── Types ──
export type {
    // Inputs
    StudySessionInput,
    QuestionSessionInput,
    SubjectPlanInput,
    PlanInput,
    PlanEngineContext,
    PortfolioEngineContext,
    // Computed
    SubjectHealth,
    Recommendation,
    DailyPlanBlock,
    DailyPlan,
    DailyPlanSummary,
    PostSessionFeedback,
    PlanRanking,
    SharedSubject,
    PortfolioAlert,
    PlanPortfolio,
    PortfolioKPIs,
} from './types';

// ── Value Objects ──
export {
    clampScore,
    computeUrgency,
    createPlanningWindow,
    daysBetween,
    computeUrgencyFactor,
    type PlanningWindow,
} from './value-objects';

// ── Services ──
export {
    computeAllSubjectHealth,
    applyPriorityCalculation,
    computeFullPriority,
    selectTopPriorities,
    DEFAULT_PRIORITY_WEIGHTS,
    type PriorityWeights,
    generateRecommendationsForPlan,
    computePortfolio,
    computeBonusFactor,
    computeCreditedMinutes,
} from './services';
