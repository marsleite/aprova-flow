import { describe, expect, it } from 'vitest';
import {
  buildSimulationOverview,
  resolveProvasTab,
} from '@/lib/provas/overview';

describe('provas overview helpers', () => {
  it('falls back to oficiais when the tab query is invalid', () => {
    expect(resolveProvasTab(null)).toBe('oficiais');
    expect(resolveProvasTab('desconhecido')).toBe('oficiais');
    expect(resolveProvasTab('simulados')).toBe('simulados');
  });

  it('builds a simulation overview from recent subject accuracy signals', () => {
    const overview = buildSimulationOverview([
      {
        subject: 'Direito Constitucional',
        totalQuestions: 18,
        correctAnswers: 9,
        accuracy: 50,
        sessions: 2,
      },
      {
        subject: 'Direito Administrativo',
        totalQuestions: 10,
        correctAnswers: 9,
        accuracy: 90,
        sessions: 1,
      },
      {
        subject: 'Português',
        totalQuestions: 6,
        correctAnswers: 2,
        accuracy: 33,
        sessions: 1,
      },
    ]);

    expect(overview.hasData).toBe(true);
    expect(overview.totalQuestions).toBe(34);
    expect(overview.avgAccuracy).toBe(59);
    expect(overview.trackedSubjects).toBe(3);
    expect(overview.criticalSubjects).toBe(1);
    expect(overview.weakestSubject?.subject).toBe('Português');
    expect(overview.strongestSubject?.subject).toBe('Direito Administrativo');
    expect(overview.topSubjects.map((item) => item.subject)).toEqual([
      'Direito Constitucional',
      'Direito Administrativo',
      'Português',
    ]);
  });
});
