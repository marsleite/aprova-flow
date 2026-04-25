import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { StudySession, SubjectWeight } from '@/types';

vi.mock('@/lib/firebase/config', () => ({
  db: {},
}));

let buildPlanVsActualFromInputs: typeof import('@/lib/firebase/sessions').buildPlanVsActualFromInputs;
let buildStudyConsistencyFromSessions: typeof import('@/lib/firebase/sessions').buildStudyConsistencyFromSessions;
let buildStudySummaryFromSessions: typeof import('@/lib/firebase/sessions').buildStudySummaryFromSessions;
let buildSubjectHoursFromSessions: typeof import('@/lib/firebase/sessions').buildSubjectHoursFromSessions;

beforeAll(async () => {
  ({
    buildPlanVsActualFromInputs,
    buildStudyConsistencyFromSessions,
    buildStudySummaryFromSessions,
    buildSubjectHoursFromSessions,
  } = await import('@/lib/firebase/sessions'));
});

const sessions: StudySession[] = [
  {
    id: 's-1',
    userId: 'user-1',
    planId: 'plan-1',
    subject: 'Direito Constitucional',
    startTime: '2026-04-08T08:00:00.000Z',
    endTime: '2026-04-08T09:00:00.000Z',
    duration: 3600,
    date: '2026-04-08',
  },
  {
    id: 's-2',
    userId: 'user-1',
    planId: 'plan-1',
    subject: 'Direito Administrativo',
    startTime: '2026-04-07T08:00:00.000Z',
    endTime: '2026-04-07T09:30:00.000Z',
    duration: 5400,
    date: '2026-04-07',
  },
  {
    id: 's-3',
    userId: 'user-1',
    planId: 'plan-1',
    subject: 'Direito Constitucional',
    startTime: '2026-04-06T08:00:00.000Z',
    endTime: '2026-04-06T08:30:00.000Z',
    duration: 1800,
    date: '2026-04-06',
  },
  {
    id: 's-4',
    userId: 'user-1',
    planId: 'plan-1',
    subject: 'Direito Penal',
    startTime: '2026-03-31T10:00:00.000Z',
    endTime: '2026-03-31T11:00:00.000Z',
    duration: 3600,
    date: '2026-03-31',
  },
];

describe('session metric builders', () => {
  it('derives summary and weekly consistency from preloaded sessions', () => {
    const now = new Date('2026-04-08T12:00:00.000Z');

    expect(buildStudySummaryFromSessions(sessions, now)).toEqual({
      totalToday: 3600,
      totalWeek: 10800,
      totalMonth: 10800,
    });

    expect(
      buildStudyConsistencyFromSessions({
        sessions,
        weeklyGoalHours: 10,
        now,
      })
    ).toMatchObject({
      currentStreak: 3,
      bestStreak: 3,
      daysStudiedThisWeek: 3,
      weeklyGoalHours: 10,
      weeklyTotalSeconds: 10800,
      weeklyProgressPercent: 30,
    });
  });

  it('builds plan-vs-actual from aggregated month subject hours', () => {
    const planSubjects: SubjectWeight[] = [
      { subject: 'Direito Constitucional', weight: 60 },
      { subject: 'Direito Administrativo', weight: 40 },
    ];

    const monthOnly = sessions.filter((session) => session.date >= '2026-04-01');
    const subjectHours = buildSubjectHoursFromSessions(monthOnly);

    expect(subjectHours).toEqual([
      { subject: 'Direito Constitucional', hours: 1.5 },
      { subject: 'Direito Administrativo', hours: 1.5 },
    ]);

    expect(buildPlanVsActualFromInputs(planSubjects, subjectHours)).toEqual([
      {
        subject: 'Direito Constitucional',
        plannedPercent: 60,
        actualPercent: 50,
        actualHours: 1.5,
        deviation: -10,
        status: 'ok',
      },
      {
        subject: 'Direito Administrativo',
        plannedPercent: 40,
        actualPercent: 50,
        actualHours: 1.5,
        deviation: 10,
        status: 'ok',
      },
    ]);
  });
});
