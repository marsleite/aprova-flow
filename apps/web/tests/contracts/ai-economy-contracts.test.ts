import { describe, expect, it } from 'vitest';
import type {
  AiBudgetDecision,
  AiDecisionResponse,
  AiEconomyUsageEvent,
} from '@aprovamind/contracts';

describe('AI economy contracts', () => {
  it('represents a budget blocked decision without paid provider usage', () => {
    const decision: AiDecisionResponse = {
      status: 'blocked_by_budget',
      latencyMs: 0,
      fallbackUsed: true,
      budgetBlocked: true,
      userMessage: 'Limite de orçamento de IA atingido.',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      },
      errorCode: 'user_daily_budget',
    };

    expect(decision.provider).toBeUndefined();
    expect(decision.budgetBlocked).toBe(true);
    expect(decision.status).toBe('blocked_by_budget');
  });

  it('represents budget policy limits with user and global scopes', () => {
    const budget: AiBudgetDecision = {
      allowed: false,
      task: 'chat',
      estimatedRequestCostUsd: 0.001,
      blockReason: 'global_monthly_budget',
      limits: [
        {
          scope: 'user',
          window: 'day',
          limitUsd: 0.05,
          consumedUsd: 0.01,
          reservedUsd: 0,
          remainingUsd: 0.04,
        },
        {
          scope: 'global',
          window: 'month',
          limitUsd: 10,
          consumedUsd: 10,
          reservedUsd: 0,
          remainingUsd: 0,
        },
      ],
    };

    expect(budget.limits.map((limit) => limit.scope)).toEqual(['user', 'global']);
    expect(budget.allowed).toBe(false);
  });

  it('records non-success AI usage events for admin analytics', () => {
    const event: AiEconomyUsageEvent = {
      route: '/api/chat',
      task: 'chat',
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
      status: 'blocked_by_budget',
      fallbackUsed: false,
      budgetBlocked: true,
    };

    expect(event.status).toBe('blocked_by_budget');
    expect(event.budgetBlocked).toBe(true);
  });
});
