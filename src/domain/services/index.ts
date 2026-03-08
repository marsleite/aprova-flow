/**
 * Domain Services — barrel export
 */
export { computeAllSubjectHealth } from './SubjectHealthComputer';
export {
    applyPriorityCalculation,
    computeFullPriority,
    selectTopPriorities,
    DEFAULT_PRIORITY_WEIGHTS,
    type PriorityWeights,
} from './PriorityCalculator';
export {
    generateRecommendationsForPlan,
    generateRecommendationsForHealthEntries,
} from './RecommendationEngine';
export {
    runPlanEngine,
    type PlanEngineResult,
    type RunPlanEngineOptions,
} from './PlanEngine';
export {
    computePortfolio,
    computeBonusFactor,
    computeCreditedMinutes,
} from './PortfolioAllocator';
