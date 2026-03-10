import { describe, expect, it } from 'vitest';
import { RecommendationType, generateRecommendationsForPlan } from '@/domain';
import { buildPlan, buildQuestionSession, buildStudySession } from './fixtures/engine.fixtures';

const URGENCY_WEIGHT = {
  immediate: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

describe('Recommendation engine', () => {
  it('sorts recommendations by urgency and then priority', () => {
    const plan = buildPlan({
      weeklyGoalHours: 10,
      subjects: [
        { subject: 'Direito Constitucional', weight: 50, priorityOverride: null },
        { subject: 'Direito Administrativo', weight: 30, priorityOverride: null },
        { subject: 'Português', weight: 20, priorityOverride: null },
      ],
    });

    const sessions = [
      buildStudySession({ subject: 'Direito Constitucional', hours: 1, date: '2026-02-28' }),
      buildStudySession({ subject: 'Direito Administrativo', hours: 1, date: '2026-03-07' }),
      buildStudySession({ subject: 'Português', hours: 2, date: '2026-03-05' }),
      buildStudySession({ subject: 'Português', hours: 2, date: '2026-03-07' }),
    ];

    const questions = [
      buildQuestionSession({
        subject: 'Direito Administrativo',
        totalQuestions: 15,
        correctAnswers: 12,
      }),
      buildQuestionSession({
        subject: 'Português',
        totalQuestions: 20,
        correctAnswers: 18,
      }),
    ];

    const recommendations = generateRecommendationsForPlan(
      plan,
      plan.subjects,
      sessions,
      questions,
      '2026-03-08'
    );

    expect(recommendations.map((item) => item.target).sort()).toEqual([
      'Direito Administrativo',
      'Direito Constitucional',
      'Português',
    ]);
    expect(recommendations).toHaveLength(3);
    expect(recommendations.some((item) => item.type === RecommendationType.Rescue)).toBe(true);
    expect(recommendations.some((item) => item.type === RecommendationType.Maintain)).toBe(true);

    for (let index = 1; index < recommendations.length; index += 1) {
      const previous = recommendations[index - 1];
      const current = recommendations[index];
      const previousUrgency = URGENCY_WEIGHT[previous.urgency];
      const currentUrgency = URGENCY_WEIGHT[current.urgency];

      expect(previousUrgency).toBeGreaterThanOrEqual(currentUrgency);

      if (previousUrgency === currentUrgency) {
        expect(previous.priorityScore).toBeGreaterThanOrEqual(current.priorityScore);
      }
    }
  });

  it('falls back to diagnostic when there is enough theory volume but no meaningful question base', () => {
    const plan = buildPlan();
    const sessions = [
      buildStudySession({ hours: 2, date: '2026-03-05' }),
      buildStudySession({ hours: 2, date: '2026-03-07' }),
    ];

    const recommendations = generateRecommendationsForPlan(
      plan,
      plan.subjects,
      sessions,
      [],
      '2026-03-08'
    );

    expect(recommendations[0].type).toBe(RecommendationType.Diagnostic);
    expect(recommendations[0].summary).toContain('Zona Cega');
  });
});
