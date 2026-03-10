import type { EnginePolicy } from '@/domain/policies/engine-policy';
import { DEFAULT_ENGINE_POLICY } from '@/domain/policies/engine-policy';
import type {
  PlanEngineContext,
  PlanInput,
  Recommendation,
  SubjectHealth,
} from '@/domain/types';
import { createPlanningWindow } from '@/domain/value-objects';
import { applyPriorityCalculation } from './PriorityCalculator';
import {
  generateRecommendationsForHealthEntries,
} from './RecommendationEngine';
import { computeAllSubjectHealth } from './SubjectHealthComputer';

export interface RunPlanEngineOptions {
  policy?: EnginePolicy;
  recommendationLimit?: number;
  recommendationTimestamp?: string;
}

export interface PlanEngineResult {
  engineVersion: string;
  plan: PlanInput;
  subjects: SubjectHealth[];
  recommendations: Recommendation[];
}

export function runPlanEngine(
  context: PlanEngineContext,
  options: RunPlanEngineOptions = {}
): PlanEngineResult {
  const policy = options.policy ?? DEFAULT_ENGINE_POLICY;
  const recommendationLimit =
    options.recommendationLimit ?? policy.recommendations.maxRecommendations;
  const window = createPlanningWindow({
    type: 'weekly',
    startDate: context.today,
    endDate: context.today,
    availableHours: context.plan.weeklyGoalHours,
    examDate: context.plan.examDate,
    today: context.today,
  });

  const prioritizedSubjects = applyPriorityCalculation(
    computeAllSubjectHealth(context, policy),
    window,
    policy
  );

  const recommendations = generateRecommendationsForHealthEntries(
    prioritizedSubjects,
    window,
    {
      policy,
      now: options.recommendationTimestamp ?? context.today,
      maxRecommendations: recommendationLimit,
    }
  );

  return {
    engineVersion: policy.engineVersion,
    plan: context.plan,
    subjects: prioritizedSubjects,
    recommendations,
  };
}
