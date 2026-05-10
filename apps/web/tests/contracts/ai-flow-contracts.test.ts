import { describe, expect, it } from 'vitest';
import type {
  AiCapabilityResponse,
  DailyPlanEligibility,
  DailyPlanResult,
  LocalhostVerificationResult,
} from '@aprovamind/contracts';

describe('AI flow contracts', () => {
  it('supports a safe AI capability response without provider internals', () => {
    const response: AiCapabilityResponse = {
      capability: 'daily_plan',
      state: 'provider_unavailable',
      message: 'IA temporariamente indisponivel.',
      nextActions: ['retry_later', 'continue_without_ai'],
    };

    expect(response.state).toBe('provider_unavailable');
    expect(response.nextActions).toContain('continue_without_ai');
  });

  it('supports daily plan eligibility and fallback result contracts', () => {
    const eligibility: DailyPlanEligibility = {
      status: 'ai_unavailable',
      canGenerate: false,
      canGenerateFallback: true,
      missingRequirements: ['IA temporariamente indisponivel.'],
      nextActions: ['generate_fallback'],
      evaluatedAt: '2026-05-10T00:00:00.000Z',
    };

    const result: DailyPlanResult = {
      status: 'fallback_ready',
      generationMode: 'deterministic_fallback',
      items: [{ subject: 'Direito Processual Civil', durationMinutes: 60, goal: 'Revisar pontos fracos' }],
      userMessage: 'Montei um plano sem IA ao vivo.',
      sourceEligibility: eligibility,
    };

    expect(result.items).toHaveLength(1);
    expect(result.sourceEligibility.canGenerateFallback).toBe(true);
  });

  it('supports localhost verification records', () => {
    const record: LocalhostVerificationResult = {
      surface: 'Planner',
      path: '/planner',
      precondition: 'Atividade registrada',
      action: 'Gerar plano',
      expectedOutcome: 'Plano gerado ou fallback exibido',
      actualOutcome: 'Pendente',
      status: 'blocked',
      severity: 'high',
    };

    expect(record.status).toBe('blocked');
  });
});
