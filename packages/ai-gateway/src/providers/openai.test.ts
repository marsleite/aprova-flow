import { afterEach, describe, expect, it } from 'vitest';
import { resolveAiTaskPolicy, runAiText } from '../gateway';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('OpenAI-compatible provider profile', () => {
  it('uses OpenRouter as the default provider profile for chat', () => {
    expect(resolveAiTaskPolicy('chat')).toMatchObject({
      provider: 'openrouter',
      model: 'qwen/qwen3-8b',
    });
  });

  it('can configure Qwen-like models through task provider overrides', () => {
    process.env.AI_PROVIDER_CHAT = 'openrouter';
    process.env.AI_MODEL_CHAT = 'qwen/qwen3-14b';

    expect(resolveAiTaskPolicy('chat')).toMatchObject({
      provider: 'openrouter',
      model: 'qwen/qwen3-14b',
    });
  });

  it('can configure DeepSeek-like models through task provider overrides without changing callers', () => {
    process.env.AI_PROVIDER_WEEKLY_MENTORING = 'openrouter';
    process.env.AI_MODEL_WEEKLY_MENTORING = 'deepseek/deepseek-v4-flash';

    expect(resolveAiTaskPolicy('weekly-mentoring')).toMatchObject({
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
    });
  });

  it('budget-blocks compatible providers before any network call', async () => {
    process.env.AI_PROVIDER_CHAT = 'openrouter';
    process.env.AI_MODEL_CHAT = 'qwen/qwen3-8b';

    const result = await runAiText({
      task: 'chat',
      prompt: 'Como recuperar atraso?',
      budget: {
        userDailyBudgetUsd: 0,
      },
    });

    expect(result.status).toBe('blocked_by_budget');
    expect(result.provider).toBe('local-heuristic');
  });
});
