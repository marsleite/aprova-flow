import type { SubjectAccuracy } from '@/types';

export type ProvasTab = 'oficiais' | 'simulados' | 'treino';

export interface SimulationOverview {
  hasData: boolean;
  totalQuestions: number;
  avgAccuracy: number;
  trackedSubjects: number;
  criticalSubjects: number;
  topSubjects: SubjectAccuracy[];
  weakestSubject: SubjectAccuracy | null;
  strongestSubject: SubjectAccuracy | null;
}

const VALID_TABS: readonly ProvasTab[] = ['oficiais', 'simulados', 'treino'] as const;

export function resolveProvasTab(value: string | null | undefined): ProvasTab {
  return VALID_TABS.includes(value as ProvasTab) ? (value as ProvasTab) : 'oficiais';
}

export function buildSimulationOverview(accuracyData: SubjectAccuracy[]): SimulationOverview {
  const trackedSubjects = accuracyData.filter((item) => item.totalQuestions > 0);
  const totalQuestions = trackedSubjects.reduce((sum, item) => sum + item.totalQuestions, 0);
  const totalCorrect = trackedSubjects.reduce((sum, item) => sum + item.correctAnswers, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const criticalSubjects = trackedSubjects.filter(
    (item) => item.totalQuestions >= 5 && item.accuracy < 50
  ).length;

  const topSubjects = [...trackedSubjects]
    .sort(
      (a, b) =>
        b.totalQuestions - a.totalQuestions
        || a.accuracy - b.accuracy
        || a.subject.localeCompare(b.subject)
    )
    .slice(0, 5);

  const weakestSubject = trackedSubjects.length
    ? [...trackedSubjects].sort(
        (a, b) =>
          a.accuracy - b.accuracy
          || b.totalQuestions - a.totalQuestions
          || a.subject.localeCompare(b.subject)
      )[0]
    : null;

  const strongestSubject = trackedSubjects.length
    ? [...trackedSubjects].sort(
        (a, b) =>
          b.accuracy - a.accuracy
          || b.totalQuestions - a.totalQuestions
          || a.subject.localeCompare(b.subject)
      )[0]
    : null;

  return {
    hasData: trackedSubjects.length > 0,
    totalQuestions,
    avgAccuracy,
    trackedSubjects: trackedSubjects.length,
    criticalSubjects,
    topSubjects,
    weakestSubject,
    strongestSubject,
  };
}
