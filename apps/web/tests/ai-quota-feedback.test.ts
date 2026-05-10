import { FeatureCode } from '@aprovamind/domain';
import { describe, expect, it } from 'vitest';
import {
  buildAiQuotaChatMessage,
  extractAiQuotaNotice,
} from '@/lib/ai/quota-feedback';

describe('ai quota feedback', () => {
  it('builds upgrade-oriented notices for free and pro users', () => {
    expect(
      extractAiQuotaNotice({
        code: 'QUOTA_EXCEEDED',
        error: 'Limite de uso de IA atingido para este recurso.',
        task: 'explain-answer',
        planTier: 'free',
        recommendedPlan: 'pro',
        limit: 5,
        window: 'month',
        retryAfterSeconds: 3600,
        upgradeHint: 'Faça upgrade para o Pro e ganhe mais folga de IA neste tipo de análise.',
      })
    ).toEqual({
      title: 'Quota de IA do Free atingida',
      message: 'Limite de uso de IA atingido para este recurso.',
      detail:
        'Limite atual: 5/mês. Nova tentativa em cerca de 1h. Faça upgrade para o Pro e ganhe mais folga de IA neste tipo de análise.',
      recommendedPlan: 'pro',
      planTier: 'free',
      task: 'explain-answer',
      featureCode: FeatureCode.AiExplanations,
      limit: 5,
      window: 'month',
      retryAfterSeconds: 3600,
      ctaLabel: 'Entender o Pro',
      ctaHref: '/settings',
    });

    expect(
      extractAiQuotaNotice({
        code: 'QUOTA_EXCEEDED',
        error: 'Limite de uso de IA atingido para este recurso.',
        task: 'planner-daily',
        planTier: 'pro',
        recommendedPlan: 'pro',
        limit: 8,
        window: 'month',
        retryAfterSeconds: 172800,
      })
    ).toEqual({
      title: 'Quota de IA do Pro atingida',
      message: 'Limite de uso de IA atingido para este recurso.',
      detail:
        'Limite atual: 8/mês. Nova tentativa em cerca de 2 dias. O Free ajuda a ativar o motor. O Pro libera tudo: multi-edital, IA completa, plano adaptativo e recovery.',
      recommendedPlan: 'pro',
      planTier: 'pro',
      task: 'planner-daily',
      featureCode: FeatureCode.AdaptiveDailyPlan,
      limit: 8,
      window: 'month',
      retryAfterSeconds: 172800,
      ctaLabel: 'Entender o Pro',
      ctaHref: '/settings',
    });
  });

  it('creates a chat-friendly fallback copy from a quota notice', () => {
    const message = buildAiQuotaChatMessage({
      title: 'Quota de IA do Free atingida',
      message: 'Limite de uso de IA atingido para este recurso.',
      detail: 'Limite atual: 5/mês. Nova tentativa em cerca de 1h.',
      recommendedPlan: 'pro',
      ctaLabel: 'Entender o Pro',
      ctaHref: '/settings',
    });

    expect(message).toBe(
      'Quota de IA do Free atingida Limite de uso de IA atingido para este recurso. Limite atual: 5/mês. Nova tentativa em cerca de 1h. Entender o Pro em /settings.'
    );
  });
});
