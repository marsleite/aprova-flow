import {
  PriorityBand,
  RecommendationType,
  RecommendationUrgency,
  SubjectHealthStatus,
  createPlanningWindow,
  type PlanEngineContext,
  type PlanningWindow,
} from '@/domain';
import {
  FIXTURE_TODAY,
  buildPlan,
  buildPlanEngineContext,
  buildQuestionSession,
  buildStudySession,
  buildSubjectPlan,
} from '../engine.fixtures';

export type CanonicalScenarioName =
  | 'healthy'
  | 'neglected'
  | 'inefficient'
  | 'blind_spot'
  | 'mature'
  | 'insufficient_data'
  | 'critical_low_adherence'
  | 'exam_near_high_priority';

export interface CanonicalScenarioExpectedOutcome {
  healthStatus?: SubjectHealthStatus;
  healthNotStatuses?: SubjectHealthStatus[];
  performanceScore?: number | null;
  minOverallScore?: number;
  maxOverallScore?: number;
  priorityBand?: PriorityBand;
  minPriorityScore?: number;
  maxPriorityScore?: number;
  topRecommendationType?: RecommendationType;
  topRecommendationUrgency?: RecommendationUrgency;
}

export interface CanonicalScenario {
  name: CanonicalScenarioName;
  description: string;
  whyItExists: string;
  context: PlanEngineContext;
  expected: CanonicalScenarioExpectedOutcome;
}

function buildScenarioWindow(context: PlanEngineContext): PlanningWindow {
  return createPlanningWindow({
    type: 'weekly',
    startDate: context.today,
    endDate: context.today,
    availableHours: context.plan.weeklyGoalHours,
    examDate: context.plan.examDate,
    today: context.today,
  });
}

const healthy = {
  name: 'healthy',
  description:
    'A subject is receiving its expected weekly effort, has recent contact, and has a meaningful question sample with good performance.',
  whyItExists:
    'This is the baseline stability case. It proves the engine does not overreact when the study rhythm is on track.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 4,
      subjects: [buildSubjectPlan({ subject: 'Direito Constitucional', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-03-04' }),
      buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-03-07' }),
    ],
    questions: [
      buildQuestionSession({
        subject: 'Direito Constitucional',
        totalQuestions: 20,
        correctAnswers: 14,
        date: '2026-03-07',
      }),
    ],
  }),
  expected: {
    healthStatus: SubjectHealthStatus.Healthy,
    performanceScore: 70,
    minOverallScore: 70,
    topRecommendationType: RecommendationType.Maintain,
    topRecommendationUrgency: RecommendationUrgency.Low,
  },
} satisfies CanonicalScenario;

const neglected = {
  name: 'neglected',
  description:
    'A relevant subject had previous contact but has been left behind long enough to trigger neglect by recency.',
  whyItExists:
    'This is the canonical neglect signal and should stay stable even if scoring details evolve.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 4,
      subjects: [buildSubjectPlan({ subject: 'Direito Constitucional', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-02-28' }),
    ],
    allTimeSessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-02-28' }),
    ],
    questions: [
      buildQuestionSession({
        subject: 'Direito Constitucional',
        totalQuestions: 20,
        correctAnswers: 14,
        date: '2026-02-28',
      }),
    ],
  }),
  expected: {
    healthStatus: SubjectHealthStatus.Neglected,
    topRecommendationType: RecommendationType.Rescue,
    topRecommendationUrgency: RecommendationUrgency.High,
  },
} satisfies CanonicalScenario;

const inefficient = {
  name: 'inefficient',
  description:
    'The subject receives enough or more than enough study effort, but recent performance is weak with a meaningful question sample.',
  whyItExists:
    'This is the canonical "wrong method" case. The engine must react to low conversion, not just low volume.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 4,
      subjects: [buildSubjectPlan({ subject: 'Direito Administrativo', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Direito Administrativo', hours: 2, date: '2026-03-04' }),
      buildStudySession({ subject: 'Direito Administrativo', hours: 2, date: '2026-03-07' }),
    ],
    questions: [
      buildQuestionSession({
        subject: 'Direito Administrativo',
        totalQuestions: 20,
        correctAnswers: 10,
        date: '2026-03-07',
      }),
    ],
  }),
  expected: {
    healthStatus: SubjectHealthStatus.Inefficient,
    performanceScore: 50,
    topRecommendationType: RecommendationType.Deepen,
    topRecommendationUrgency: RecommendationUrgency.High,
  },
} satisfies CanonicalScenario;

const blindSpot = {
  name: 'blind_spot',
  description:
    'The subject accumulated relevant theory effort but still has no meaningful question data to validate performance.',
  whyItExists:
    'This protects the product from false confidence caused by theory-only study.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 4,
      subjects: [buildSubjectPlan({ subject: 'Português', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Português', hours: 2, date: '2026-03-04' }),
      buildStudySession({ subject: 'Português', hours: 2, date: '2026-03-07' }),
    ],
    questions: [],
  }),
  expected: {
    healthStatus: SubjectHealthStatus.BlindSpot,
    performanceScore: null,
    topRecommendationType: RecommendationType.Diagnostic,
    topRecommendationUrgency: RecommendationUrgency.High,
  },
} satisfies CanonicalScenario;

const mature = {
  name: 'mature',
  description:
    'The subject is both well-covered in effort and strong in recent performance, representing a stable high-mastery state.',
  whyItExists:
    'This anchors the positive extreme of the model and avoids over-prioritizing already stable subjects.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 4,
      subjects: [buildSubjectPlan({ subject: 'Direito Constitucional', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-03-04' }),
      buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-03-07' }),
    ],
    questions: [
      buildQuestionSession({
        subject: 'Direito Constitucional',
        totalQuestions: 20,
        correctAnswers: 18,
        date: '2026-03-07',
      }),
    ],
  }),
  expected: {
    healthStatus: SubjectHealthStatus.Mature,
    performanceScore: 90,
    minOverallScore: 80,
    topRecommendationType: RecommendationType.Celebrate,
    topRecommendationUrgency: RecommendationUrgency.Low,
  },
} satisfies CanonicalScenario;

const insufficientData = {
  name: 'insufficient_data',
  description:
    'There is some recent study activity, but not enough question volume to compute a reliable performance score.',
  whyItExists:
    'This keeps the engine on the effort-based path and prevents premature performance-based diagnoses.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 1,
      subjects: [buildSubjectPlan({ subject: 'Raciocínio Lógico', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Raciocínio Lógico', hours: 1, date: '2026-03-07' }),
    ],
    questions: [
      buildQuestionSession({
        subject: 'Raciocínio Lógico',
        totalQuestions: 10,
        correctAnswers: 9,
        date: '2026-03-07',
      }),
    ],
  }),
  expected: {
    performanceScore: null,
    healthNotStatuses: [SubjectHealthStatus.Inefficient],
  },
} satisfies CanonicalScenario;

const criticalLowAdherence = {
  name: 'critical_low_adherence',
  description:
    'A high-weight subject is still being touched recently, but weekly effort is far below target, causing a critical state by under-allocation.',
  whyItExists:
    'This captures the case where the student is not absent, but is still severely underinvesting in a relevant subject.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      weeklyGoalHours: 20,
      subjects: [buildSubjectPlan({ subject: 'Direito Constitucional', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 0.5, date: '2026-03-07' }),
    ],
    allTimeSessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 0.5, date: '2026-03-07' }),
    ],
  }),
  expected: {
    healthStatus: SubjectHealthStatus.Critical,
    maxOverallScore: 49,
    topRecommendationType: RecommendationType.Rescue,
    topRecommendationUrgency: RecommendationUrgency.Immediate,
  },
} satisfies CanonicalScenario;

const examNearHighPriority = {
  name: 'exam_near_high_priority',
  description:
    'A high-weight subject is below target and the exam is very close, so urgency should push it to the top of the day.',
  whyItExists:
    'This is the canonical proximity case and should prove that exam timing changes priority without changing the source of truth.',
  context: buildPlanEngineContext({
    plan: buildPlan({
      examDate: '2026-03-18',
      weeklyGoalHours: 4,
      subjects: [buildSubjectPlan({ subject: 'Direito Constitucional', weight: 100 })],
    }),
    sessions: [
      buildStudySession({ subject: 'Direito Constitucional', hours: 1, date: '2026-03-06' }),
    ],
    questions: [
      buildQuestionSession({
        subject: 'Direito Constitucional',
        totalQuestions: 20,
        correctAnswers: 14,
        date: '2026-03-07',
      }),
    ],
  }),
  expected: {
    priorityBand: PriorityBand.Critical,
    minPriorityScore: 80,
    topRecommendationUrgency: RecommendationUrgency.Immediate,
  },
} satisfies CanonicalScenario;

export const CANONICAL_SCENARIOS: Record<CanonicalScenarioName, CanonicalScenario> = {
  healthy,
  neglected,
  inefficient,
  blind_spot: blindSpot,
  mature,
  insufficient_data: insufficientData,
  critical_low_adherence: criticalLowAdherence,
  exam_near_high_priority: examNearHighPriority,
};

export function getCanonicalScenario(name: CanonicalScenarioName): CanonicalScenario {
  return CANONICAL_SCENARIOS[name];
}

export function listCanonicalScenarios(): CanonicalScenario[] {
  return Object.values(CANONICAL_SCENARIOS);
}

export function createCanonicalScenarioWindow(name: CanonicalScenarioName): PlanningWindow {
  return buildScenarioWindow(getCanonicalScenario(name).context);
}

export const CANONICAL_SCENARIO_NAMES = Object.keys(
  CANONICAL_SCENARIOS
) as CanonicalScenarioName[];

export { FIXTURE_TODAY };
