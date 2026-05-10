import { describe, expect, it } from 'vitest';
import { resolveDailyPlanEligibility } from '@aprovamind/application/use-cases/planner/ResolveDailyPlanEligibility';

const evaluatedAt = '2026-05-10T00:00:00.000Z';

describe('resolveDailyPlanEligibility', () => {
  it('blocks generation with a clear requirement when activity is missing', () => {
    expect(resolveDailyPlanEligibility({ evaluatedAt })).toMatchObject({
      status: 'missing_data',
      canGenerate: false,
      canGenerateFallback: false,
      nextActions: ['register_activity'],
    });
  });

  it('allows generation when activity exists and AI is enabled', () => {
    expect(
      resolveDailyPlanEligibility({
        evaluatedAt,
        activity: { totalQuestions: 10, correctAnswers: 7, subjectCount: 1 },
        aiCapability: {
          capability: 'daily_plan',
          state: 'enabled',
          message: 'IA pronta.',
          nextActions: [],
        },
      })
    ).toMatchObject({
      status: 'eligible',
      canGenerate: true,
      canGenerateFallback: true,
      missingRequirements: [],
    });
  });

  it('allows deterministic fallback when AI is unavailable after valid activity', () => {
    expect(
      resolveDailyPlanEligibility({
        evaluatedAt,
        activity: { studyMinutes: 45 },
        aiCapability: {
          capability: 'daily_plan',
          state: 'provider_unavailable',
          message: 'IA temporariamente indisponivel.',
          nextActions: ['retry_later'],
        },
      })
    ).toMatchObject({
      status: 'ai_unavailable',
      canGenerate: false,
      canGenerateFallback: true,
      nextActions: ['generate_fallback', 'retry_later'],
    });
  });

  it('requires active edital when the caller asks for edital-gated plans', () => {
    expect(
      resolveDailyPlanEligibility({
        evaluatedAt,
        requiresActiveEdital: true,
        hasActiveEdital: false,
        activity: { totalQuestions: 5, correctAnswers: 3 },
      })
    ).toMatchObject({
      status: 'missing_active_edital',
      nextActions: ['manage_editais'],
    });
  });
});
