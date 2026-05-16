import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAiTaskPolicy, runAiText } from '@aprovamind/ai-gateway';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('AI gateway task policy', () => {
  it('keeps OpenRouter as the economical chat default', () => {
    const policy = resolveAiTaskPolicy('chat');

    expect(policy.provider).toBe('openrouter');
    expect(policy.model).toBe('qwen/qwen3-8b');
    expect(policy.qualityTier).toBe('economical');
  });

  it('supports task-specific compatible provider overrides', () => {
    process.env.AI_PROVIDER_CHAT = 'openai-compatible';
    process.env.AI_MODEL_CHAT = 'qwen-flash';

    const policy = resolveAiTaskPolicy('chat');

    expect(policy.provider).toBe('openai-compatible');
    expect(policy.model).toBe('qwen-flash');
  });

  it('blocks paid calls when request budget is exhausted', async () => {
    const result = await runAiText({
      task: 'chat',
      prompt: 'Como estudar hoje?',
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
