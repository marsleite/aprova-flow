import { describe, expect, it } from 'vitest';
import { resolveAiBudgetPolicy } from '@aprovamind/domain/ai/AiBudgetPolicy';

describe('resolveAiBudgetPolicy', () => {
  it('allows a request within user and global budgets', () => {
    const decision = resolveAiBudgetPolicy({
      task: 'chat',
      estimatedRequestCostUsd: 0.01,
      userDailyBudgetUsd: 0.05,
      globalMonthlyBudgetUsd: 10,
      userDailyConsumedUsd: 0.01,
      globalMonthlyConsumedUsd: 2,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.limits).toHaveLength(2);
  });

  it('blocks when user daily budget is exhausted', () => {
    const decision = resolveAiBudgetPolicy({
      task: 'chat',
      estimatedRequestCostUsd: 0.01,
      userDailyBudgetUsd: 0.05,
      userDailyConsumedUsd: 0.05,
      globalMonthlyBudgetUsd: 10,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockReason).toBe('user_daily_budget');
  });

  it('blocks when global monthly budget is exhausted', () => {
    const decision = resolveAiBudgetPolicy({
      task: 'weekly-mentoring',
      estimatedRequestCostUsd: 0.01,
      userDailyBudgetUsd: 1,
      globalMonthlyBudgetUsd: 10,
      globalMonthlyConsumedUsd: 10,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockReason).toBe('global_monthly_budget');
  });
});
