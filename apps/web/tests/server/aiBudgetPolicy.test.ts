import { describe, expect, it } from 'vitest';
import { runAiText } from '@aprovamind/ai-gateway';
import { extractAiBudgetNotice } from '@/lib/ai/quota-feedback';

describe('AI budget policy server-facing behavior', () => {
  it('returns a friendly blocked state before paid chat usage', async () => {
    const result = await runAiText({
      task: 'chat',
      prompt: 'Quanto devo estudar hoje?',
      route: '/api/chat',
      budget: {
        userDailyBudgetUsd: 0,
        globalMonthlyBudgetUsd: 10,
      },
    });

    expect(result.status).toBe('blocked_by_budget');
    expect(extractAiBudgetNotice({
      status: result.status,
      budgetBlocked: result.budgetBlocked,
      userMessage: result.userMessage,
      errorCode: result.errorCode,
      task: 'chat',
    })).toMatchObject({
      title: 'Orçamento de IA protegido',
      errorCode: 'user_daily_budget',
    });
  });
});
