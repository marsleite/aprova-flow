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
export { generateRecommendationsForPlan } from './RecommendationEngine';
export {
    computePortfolio,
    computeBonusFactor,
    computeCreditedMinutes,
} from './PortfolioAllocator';
