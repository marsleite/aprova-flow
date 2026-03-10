import { describe, expect, it } from 'vitest';
import {
  SubjectHealthStatus,
  applyPriorityCalculation,
  computeAllSubjectHealth,
  createPlanningWindow,
} from '@/domain';
import {
  FIXTURE_TODAY,
  buildPlan,
  buildPlanEngineContext,
  buildQuestionSession,
  buildStudySession,
} from './fixtures/engine.fixtures';

describe('Priority score', () => {
  it('increases priority when the exam is close', () => {
    const healthEntries = computeAllSubjectHealth(
      buildPlanEngineContext({
        plan: buildPlan(),
        sessions: [buildStudySession({ hours: 2, date: '2026-03-07' })],
        questions: [buildQuestionSession({ totalQuestions: 15, correctAnswers: 15 })],
      })
    );

    const farWindow = createPlanningWindow({
      type: 'weekly',
      startDate: FIXTURE_TODAY,
      endDate: FIXTURE_TODAY,
      availableHours: 20,
      examDate: '2026-10-15',
      today: FIXTURE_TODAY,
    });

    const nearWindow = createPlanningWindow({
      type: 'weekly',
      startDate: FIXTURE_TODAY,
      endDate: FIXTURE_TODAY,
      availableHours: 20,
      examDate: '2026-03-18',
      today: FIXTURE_TODAY,
    });

    const farPriority = applyPriorityCalculation(healthEntries, farWindow)[0];
    const nearPriority = applyPriorityCalculation(healthEntries, nearWindow)[0];

    expect(nearPriority.priority.score).toBeGreaterThan(farPriority.priority.score);
    expect(
      nearPriority.priority.reasons.some((reason) => reason.includes('Proximidade da prova'))
    ).toBe(true);
  });

  it('does not treat no_data as extreme recency debt', () => {
    const noDataHealthEntries = computeAllSubjectHealth(
      buildPlanEngineContext({
        plan: buildPlan(),
      })
    );

    const neglectedSessions = [buildStudySession({ hours: 2, date: '2026-02-28' })];
    const neglectedHealthEntries = computeAllSubjectHealth(
      buildPlanEngineContext({
        plan: buildPlan(),
        sessions: neglectedSessions,
        allTimeSessions: neglectedSessions,
      })
    );

    const window = createPlanningWindow({
      type: 'weekly',
      startDate: FIXTURE_TODAY,
      endDate: FIXTURE_TODAY,
      availableHours: 20,
      examDate: null,
      today: FIXTURE_TODAY,
    });

    const noDataPriority = applyPriorityCalculation(noDataHealthEntries, window)[0];
    const neglectedPriority = applyPriorityCalculation(neglectedHealthEntries, window)[0];

    expect(noDataPriority.status).toBe(SubjectHealthStatus.NoData);
    expect(neglectedPriority.status).toBe(SubjectHealthStatus.Neglected);
    expect(noDataPriority.priority.score).toBeLessThan(neglectedPriority.priority.score);
    expect(noDataPriority.priority.reasons.some((reason) => reason.includes('999 dias'))).toBe(
      false
    );
    expect(
      noDataPriority.priority.reasons.some((reason) =>
        reason.includes('Sem histórico recente suficiente')
      )
    ).toBe(true);
  });
});
