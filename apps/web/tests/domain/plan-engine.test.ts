import { describe, expect, it } from 'vitest';
import {
  RecommendationUrgency,
  runPlanEngine,
} from '@aprovamind/domain';
import { getCanonicalScenario } from './fixtures/canonical';

describe('Plan engine', () => {
  it('computes prioritized subjects and recommendations from a pure context', () => {
    const scenario = getCanonicalScenario('healthy');

    const result = runPlanEngine(scenario.context, {
      recommendationLimit: 1,
      recommendationTimestamp: scenario.context.today,
    });

    expect(result.engineVersion).toBeTruthy();
    expect(result.plan.planId).toBe(scenario.context.plan.planId);
    expect(result.subjects).toHaveLength(1);
    expect(result.subjects[0].subject).toBe('Direito Constitucional');
    expect(typeof result.subjects[0].priority.score).toBe('number');
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].target).toBe('Direito Constitucional');
    expect(typeof result.recommendations[0].type).toBe('string');
    expect(result.recommendations[0].urgency).toBe(RecommendationUrgency.Low);
  });
});
