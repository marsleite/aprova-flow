import { describe, expect, it } from 'vitest';
import { SubjectHealthStatus, computeAllSubjectHealth } from '@/domain';
import {
  buildPlan,
  buildPlanEngineContext,
  buildQuestionSession,
  buildStudySession,
} from './fixtures/engine.fixtures';

function computeSingleStatus(ctx = buildPlanEngineContext()) {
  return computeAllSubjectHealth(ctx)[0];
}

describe('Subject health', () => {
  it('classifies a subject as healthy', () => {
    const result = computeSingleStatus(
      buildPlanEngineContext({
        plan: buildPlan(),
        sessions: [
          buildStudySession({ hours: 2, date: '2026-03-05' }),
          buildStudySession({ hours: 2, date: '2026-03-07' }),
        ],
        questions: [buildQuestionSession({ totalQuestions: 20, correctAnswers: 14 })],
      })
    );

    expect(result.status).toBe(SubjectHealthStatus.Healthy);
    expect(result.metrics.performanceScore).toBe(70);
    expect(result.metrics.overallScore).toBeGreaterThanOrEqual(70);
  });

  it('classifies a subject as neglected after too many days without contact', () => {
    const sessions = [buildStudySession({ hours: 2, date: '2026-02-28' })];

    const result = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        allTimeSessions: sessions,
      })
    );

    expect(result.status).toBe(SubjectHealthStatus.Neglected);
    expect(result.raw.daysSinceLastStudy).toBe(8);
  });

  it('classifies a subject as critical when weekly effort collapses but recency is still recent', () => {
    const sessions = [buildStudySession({ hours: 0.5, date: '2026-03-07' })];

    const result = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        allTimeSessions: sessions,
      })
    );

    expect(result.status).toBe(SubjectHealthStatus.Critical);
    expect(result.metrics.volumeScore).toBeLessThan(20);
    expect(result.raw.deviationPercent).toBeLessThan(-50);
  });

  it('classifies a subject as inefficient when effort is high and performance is low', () => {
    const sessions = [
      buildStudySession({ hours: 2, date: '2026-03-04' }),
      buildStudySession({ hours: 2, date: '2026-03-07' }),
    ];

    const result = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        questions: [buildQuestionSession({ totalQuestions: 20, correctAnswers: 10 })],
      })
    );

    expect(result.status).toBe(SubjectHealthStatus.Inefficient);
    expect(result.metrics.volumeScore).toBeGreaterThanOrEqual(100);
    expect(result.metrics.performanceScore).toBe(50);
  });

  it('classifies a subject as blind spot when study volume exists without enough question data', () => {
    const sessions = [
      buildStudySession({ hours: 2, date: '2026-03-04' }),
      buildStudySession({ hours: 2, date: '2026-03-07' }),
    ];

    const result = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        questions: [],
      })
    );

    expect(result.status).toBe(SubjectHealthStatus.BlindSpot);
    expect(result.metrics.performanceScore).toBeNull();
  });

  it('classifies a subject as mature when both consistency and performance are high', () => {
    const sessions = [
      buildStudySession({ hours: 2, date: '2026-03-05' }),
      buildStudySession({ hours: 2, date: '2026-03-07' }),
    ];

    const result = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        questions: [buildQuestionSession({ totalQuestions: 20, correctAnswers: 18 })],
      })
    );

    expect(result.status).toBe(SubjectHealthStatus.Mature);
    expect(result.metrics.performanceScore).toBe(90);
    expect(result.metrics.overallScore).toBeGreaterThanOrEqual(80);
  });

  it('classifies a subject as no_data when there are no study records at all', () => {
    const result = computeSingleStatus(buildPlanEngineContext());

    expect(result.status).toBe(SubjectHealthStatus.NoData);
    expect(result.raw.totalHoursAllTime).toBe(0);
  });

  it('keeps performance null below the minimum questions threshold and uses the effort-only path', () => {
    const sessions = [buildStudySession({ hours: 2, date: '2026-03-07' })];

    const withoutEnoughQuestions = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        questions: [buildQuestionSession({ totalQuestions: 14, correctAnswers: 14 })],
      })
    );

    const withEnoughQuestions = computeSingleStatus(
      buildPlanEngineContext({
        sessions,
        questions: [buildQuestionSession({ totalQuestions: 15, correctAnswers: 15 })],
      })
    );

    expect(withoutEnoughQuestions.metrics.performanceScore).toBeNull();
    expect(withEnoughQuestions.metrics.performanceScore).toBe(100);
    expect(withoutEnoughQuestions.metrics.overallScore).toBeLessThan(
      withEnoughQuestions.metrics.overallScore
    );
  });
});
