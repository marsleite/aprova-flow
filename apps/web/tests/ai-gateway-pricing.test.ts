import { describe, expect, it } from 'vitest';
import {
  estimateRequestCostUsd,
  getModelPricing,
} from '@aprovamind/ai-gateway';

describe('AI gateway pricing', () => {
  it('includes economical Qwen and DeepSeek model prices', () => {
    expect(getModelPricing('qwen-flash')).toMatchObject({
      inputPer1M: 0.022,
      outputPer1M: 0.216,
    });
    expect(getModelPricing('deepseek-chat')).toMatchObject({
      inputPer1M: 0.28,
      outputPer1M: 0.42,
    });
  });

  it('estimates request cost from configured model prices', () => {
    expect(estimateRequestCostUsd({
      model: 'gemini-2.5-flash-lite',
      estimatedInputTokens: 1_000_000,
      estimatedOutputTokens: 1_000_000,
    })).toBe(0.5);
  });
});
