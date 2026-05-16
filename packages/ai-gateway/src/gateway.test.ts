import { afterEach, describe, expect, it } from 'vitest';
import { resolveAiTaskPolicy } from './gateway';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('resolveAiTaskPolicy', () => {
  it('uses OpenRouter economical chat by default', () => {
    expect(resolveAiTaskPolicy('chat')).toMatchObject({
      provider: 'openrouter',
      model: 'qwen/qwen3-8b',
      qualityTier: 'economical',
    });
  });

  it('uses task-specific provider and model overrides', () => {
    process.env.AI_PROVIDER_CHAT = 'openrouter';
    process.env.AI_MODEL_CHAT = 'deepseek/deepseek-v4-flash';

    expect(resolveAiTaskPolicy('chat')).toMatchObject({
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
    });
  });
});
