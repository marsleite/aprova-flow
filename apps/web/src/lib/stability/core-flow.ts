import type { PlanTier } from '@/lib/entitlements';
import { canCreateMorePlans } from '@/lib/entitlements';
import type { StudyPlanEdital } from '@/types';

export interface PlannerCreateEditalStateInput {
  planTier: PlanTier;
  currentPlansCount: number;
  canUseMultiEdital: boolean;
}

export type PlannerCreateEditalState =
  | {
      kind: 'create';
      buttonLabel: string;
      helperText: null;
      recommendedPlan: null;
    }
  | {
      kind: 'upgrade';
      buttonLabel: string;
      helperText: string;
      recommendedPlan: 'pro';
    }
  | {
      kind: 'disabled';
      buttonLabel: string;
      helperText: string;
      recommendedPlan: null;
    };

export function getPlannerCreateEditalState({
  planTier,
  currentPlansCount,
  canUseMultiEdital,
}: PlannerCreateEditalStateInput): PlannerCreateEditalState {
  const canCreate = canCreateMorePlans(planTier, currentPlansCount);

  if (canCreate) {
    return {
      kind: 'create',
      buttonLabel: 'Novo Edital',
      helperText: null,
      recommendedPlan: null,
    };
  }

  if (!canUseMultiEdital && currentPlansCount > 0) {
    return {
      kind: 'upgrade',
      buttonLabel: 'Novo edital no Pro',
      helperText: 'O Pro libera multi-edital, IA completa, plano adaptativo e recovery.',
      recommendedPlan: 'pro',
    };
  }

  return {
    kind: 'disabled',
    buttonLabel: 'Novo Edital',
    helperText: 'Você atingiu o limite de editais ativos deste acesso.',
    recommendedPlan: null,
  };
}

export interface SandboxContextMessageInput {
  usingSandbox: boolean;
  sandboxScenarioUserId: string | null;
}

export function getSandboxContextMessage({
  usingSandbox,
  sandboxScenarioUserId,
}: SandboxContextMessageInput): string | null {
  if (!usingSandbox || !sandboxScenarioUserId) {
    return null;
  }

  return `Cenário local ativo: ${sandboxScenarioUserId}. Os gates desta tela refletem o sandbox até você voltar para o usuário real em Settings.`;
}

export type CoreFlowPlanContextState =
  | {
      kind: 'ready';
    }
  | {
      kind: 'missing-plan';
      reason: 'no-plans' | 'missing-active-plan';
      title: string;
      description: string;
      ctaLabel: string;
    };

export function getCoreFlowPlanContextState(
  plans: StudyPlanEdital[],
  activePlanId: string | null
): CoreFlowPlanContextState {
  if (plans.length === 0) {
    return {
      kind: 'missing-plan',
      reason: 'no-plans',
      title: 'Você ainda não configurou um edital',
      description:
        'Comece no Planner para criar o primeiro edital e destravar a jornada Dashboard -> Engine com um contexto real de estudo.',
      ctaLabel: 'Abrir Planner',
    };
  }

  const hasActivePlan = plans.some((plan) => plan.id === activePlanId);
  if (!activePlanId || !hasActivePlan) {
    return {
      kind: 'missing-plan',
      reason: 'missing-active-plan',
      title: 'Selecione um edital ativo no Planner',
      description:
        'O Dashboard, o Engine e a Revisão Geral precisam de um edital ativo para mostrar a semana certa e a próxima melhor sessão sem cair em uma tela vazia.',
      ctaLabel: 'Gerenciar editais',
    };
  }

  return { kind: 'ready' };
}
