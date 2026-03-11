import type { PlanEngineSnapshotV1 } from '@aprovamind/contracts/engine/PlanEngineSnapshot';
import type { PlanEngineResult } from '@aprovamind/domain/services/PlanEngine';

export interface ToPlanEngineSnapshotOptions {
  maxRecommendations?: number;
  maxReasonsPerRecommendation?: number;
}

const DEFAULT_MAX_RECOMMENDATIONS = 3;
const DEFAULT_MAX_REASONS_PER_RECOMMENDATION = 3;

export function toPlanEngineSnapshot(
  result: PlanEngineResult,
  options: ToPlanEngineSnapshotOptions = {}
): PlanEngineSnapshotV1 {
  const maxRecommendations =
    options.maxRecommendations ?? DEFAULT_MAX_RECOMMENDATIONS;
  const maxReasonsPerRecommendation =
    options.maxReasonsPerRecommendation ??
    DEFAULT_MAX_REASONS_PER_RECOMMENDATION;

  return {
    engineVersion: result.engineVersion,
    plan: {
      planId: result.plan.planId,
      name: result.plan.name,
      examDate: result.plan.examDate,
      weeklyGoalHours: result.plan.weeklyGoalHours,
    },
    subjects: [...result.subjects].map((item) => ({
      subject: item.subject,
      weight: item.weight,
      status: item.status,
      priorityScore: item.priority.score,
      priorityBand: item.priority.band,
      metrics: {
        overallScore: item.metrics.overallScore,
        volumeScore: item.metrics.volumeScore,
        frequencyScore: item.metrics.frequencyScore,
        adherenceScore: item.metrics.adherenceScore,
        recencyScore: item.metrics.recencyScore,
        performanceScore: item.metrics.performanceScore,
      },
    })),
    recommendations: [...result.recommendations]
      .slice(0, maxRecommendations)
      .map((item) => ({
        targetSubject: item.target,
        type: item.type,
        urgency: item.urgency,
        dueWindow: item.dueWindow,
        priorityScore: item.priorityScore,
        reasons: item.reason.slice(0, maxReasonsPerRecommendation),
      })),
  };
}
