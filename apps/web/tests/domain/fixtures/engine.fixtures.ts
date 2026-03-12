import type {
  PlanEngineContext,
  PlanInput,
  PortfolioEngineContext,
  QuestionSessionInput,
  StudySessionInput,
  SubjectPlanInput,
} from '@aprovamind/domain/types';

export const FIXTURE_TODAY = '2026-03-08';

export function buildSubjectPlan(
  overrides: Partial<SubjectPlanInput> = {}
): SubjectPlanInput {
  return {
    subject: 'Direito Constitucional',
    weight: 100,
    priorityOverride: null,
    ...overrides,
  };
}

export function buildPlan(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    planId: 'plan-1',
    name: 'PGE-SP 2026',
    subjects: [buildSubjectPlan()],
    weeklyGoalHours: 4,
    examDate: null,
    color: '#8b5cf6',
    userPriority: 3,
    ...overrides,
  };
}

export function buildStudySession(
  overrides: Partial<StudySessionInput> & { hours?: number } = {}
): StudySessionInput {
  const { hours = 1, ...rest } = overrides;

  return {
    subject: 'Direito Constitucional',
    durationSeconds: Math.round(hours * 3600),
    date: FIXTURE_TODAY,
    source: 'timer',
    ...rest,
  };
}

export function buildQuestionSession(
  overrides: Partial<QuestionSessionInput> = {}
): QuestionSessionInput {
  return {
    subject: 'Direito Constitucional',
    totalQuestions: 20,
    correctAnswers: 14,
    date: FIXTURE_TODAY,
    ...overrides,
  };
}

export function buildPlanEngineContext(
  overrides: Partial<PlanEngineContext> = {}
): PlanEngineContext {
  const sessions = overrides.sessions ?? [];
  const questions = overrides.questions ?? [];

  return {
    plan: buildPlan(),
    sessions,
    questions,
    allTimeSessions: overrides.allTimeSessions ?? sessions,
    allTimeQuestions: overrides.allTimeQuestions ?? questions,
    today: overrides.today ?? FIXTURE_TODAY,
  };
}

export function buildPortfolioEngineContext(
  plans: PlanInput[],
  planContexts: Map<string, PlanEngineContext>,
  overrides: Partial<PortfolioEngineContext> = {}
): PortfolioEngineContext {
  return {
    plans,
    planContexts,
    globalWeeklyBudget: overrides.globalWeeklyBudget ?? 25,
    today: overrides.today ?? FIXTURE_TODAY,
  };
}
