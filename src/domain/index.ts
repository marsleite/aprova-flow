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

// ── Policies ──
export {
    DEFAULT_ENGINE_POLICY,
    createEnginePolicy,
    resolvePriorityBand,
    resolveTierValue,
    type DeepPartial,
    type EnginePolicy,
    type HealthScoreWeights,
    type PriorityBandRule,
    type PriorityPolicy,
    type PriorityPhaseOverridePolicy,
    type PriorityWeightsPolicy,
    type RecommendationDueWindow,
    type RecommendationPolicy,
    type RecommendationRoutingRule,
    type SubjectHealthPolicy,
    type SubjectStatusThresholdPolicy,
    type WeightTierValue,
} from './policies/engine-policy';

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
    generateRecommendationsForHealthEntries,
    runPlanEngine,
    type PlanEngineResult,
    type RunPlanEngineOptions,
    computePortfolio,
    computeBonusFactor,
    computeCreditedMinutes,
} from './services';
