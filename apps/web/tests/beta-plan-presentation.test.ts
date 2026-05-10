import { describe, expect, it } from 'vitest';
import {
  getBetaPlanDisplay,
  getBetaUpgradeNarrative,
  getCurrentPlanUsageLabel,
  toDisplayTier,
} from '@/lib/beta-plan-presentation';

describe('beta plan presentation', () => {
  it('derives the plan ladder from the canonical entitlement policy', () => {
    expect(getBetaPlanDisplay('free')).toEqual({
      activePlansLabel: '1 plano ativo',
      simulationsLabel: '2 por mes',
      healthLabel: 'Basica',
      weeklyDiagnosticLabel: 'Nao',
      mentoringLabel: 'Nao',
      editalParseLabel: '1 credito inicial',
      aiExplanationsLabel: '3 por mes',
      contextualChatLabel: '5 por mes',
      multiEditalLabel: 'Nao',
      recoveryPlanLabel: 'Nao',
      adaptivePlanLabel: 'Nao',
      postSimuladoLabel: 'Nao',
    });

    expect(getBetaPlanDisplay('pro')).toEqual({
      activePlansLabel: '3 planos ativos',
      simulationsLabel: 'Ilimitados + personalizados',
      healthLabel: 'Completa',
      weeklyDiagnosticLabel: 'Incluido',
      mentoringLabel: '8 por mes',
      editalParseLabel: '10 por mes',
      aiExplanationsLabel: '300 por mes',
      contextualChatLabel: '150 por mes',
      multiEditalLabel: 'Incluido',
      recoveryPlanLabel: 'Incluido',
      adaptivePlanLabel: 'Incluido',
      postSimuladoLabel: '8 por mes',
    });

  });

  it('summarizes current plan usage without a parallel limits table', () => {
    expect(getCurrentPlanUsageLabel('free', 0)).toBe('0/1 editais em uso');
    expect(getCurrentPlanUsageLabel('pro', 2)).toBe('2/3 editais em uso');
  });

  it('maps admin display back to the complete paid plan', () => {
    expect(toDisplayTier('admin')).toBe('pro');
  });

  it('exposes a canonical upgrade narrative for pro gates', () => {
    expect(getBetaUpgradeNarrative('pro')).toEqual({
      recommendedPlan: 'pro',
      planLabel: 'Pro',
      focusLabel: 'Plano completo',
      ctaLabel: 'Entender o Pro',
      bridgeCopy:
        'O Free ajuda a ativar o motor. O Pro libera tudo: multi-edital, IA completa, plano adaptativo e recovery.',
    });
  });
});
