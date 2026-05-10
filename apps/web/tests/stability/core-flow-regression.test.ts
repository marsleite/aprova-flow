import { describe, expect, it } from 'vitest';
import {
  getCoreFlowPlanContextState,
  getPlannerCreateEditalState,
} from '@/lib/stability/core-flow';
import type { StudyPlanEdital } from '@/types';

function buildPlan(id: string): StudyPlanEdital {
  return {
    id,
    userId: 'user-1',
    name: `Plano ${id}`,
    subjects: [],
    weeklyGoalHours: 10,
    color: '#3b82f6',
    isDefault: false,
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T00:00:00.000Z',
  };
}

describe('core flow regression helpers', () => {
  it('keeps the planner create action enabled while the current tier still has room', () => {
    expect(
      getPlannerCreateEditalState({
        planTier: 'free',
        currentPlansCount: 0,
        canUseMultiEdital: false,
      })
    ).toEqual({
      kind: 'create',
      buttonLabel: 'Novo Edital',
      helperText: null,
      recommendedPlan: null,
    });

    expect(
      getPlannerCreateEditalState({
        planTier: 'pro',
        currentPlansCount: 2,
        canUseMultiEdital: true,
      }).kind
    ).toBe('create');
  });

  it('turns the planner topbar into an honest upgrade CTA when multi-edital is blocked', () => {
    expect(
      getPlannerCreateEditalState({
        planTier: 'free',
        currentPlansCount: 1,
        canUseMultiEdital: false,
      })
    ).toEqual({
      kind: 'upgrade',
      buttonLabel: 'Novo edital no Pro',
      helperText: 'O Pro libera multi-edital, IA completa, plano adaptativo e recovery.',
      recommendedPlan: 'pro',
    });
  });

  it('returns an explicit missing-plan state when the flow reaches dashboard or engine sem contexto', () => {
    expect(getCoreFlowPlanContextState([], null)).toEqual({
      kind: 'missing-plan',
      reason: 'no-plans',
      title: 'Você ainda não configurou um edital',
      description:
        'Comece no Planner para criar o primeiro edital e destravar a jornada Dashboard -> Engine com um contexto real de estudo.',
      ctaLabel: 'Abrir Planner',
    });

    expect(
      getCoreFlowPlanContextState([buildPlan('plan-1')], null)
    ).toEqual({
      kind: 'missing-plan',
      reason: 'missing-active-plan',
      title: 'Selecione um edital ativo no Planner',
      description:
        'O Dashboard e o Engine precisam de um edital ativo para mostrar a semana certa e a próxima melhor sessão.',
      ctaLabel: 'Gerenciar editais',
    });
  });

  it('treats a matching active plan as a ready state for the core flow', () => {
    expect(
      getCoreFlowPlanContextState([buildPlan('plan-1')], 'plan-1')
    ).toEqual({ kind: 'ready' });
  });
});
