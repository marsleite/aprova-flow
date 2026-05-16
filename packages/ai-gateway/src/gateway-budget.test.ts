import { describe, expect, it } from 'vitest';
import { runAiText } from './gateway';

describe('runAiText budget policy', () => {
  it('returns a budget-blocked local decision before provider calls', async () => {
    const result = await runAiText({
      task: 'chat',
      prompt: 'Preciso estudar agora?',
      budget: {
        userDailyBudgetUsd: 0,
        globalMonthlyBudgetUsd: 10,
      },
    });

    expect(result.status).toBe('blocked_by_budget');
    expect(result.provider).toBe('local-heuristic');
    expect(result.budgetBlocked).toBe(true);
  });
});
