import { describe, expect, it } from 'vitest';
import { estimateRequestCostUsd, getModelPricing } from './pricing';

describe('pricing', () => {
  it('contains economical provider aliases', () => {
    expect(getModelPricing('qwen-flash')).toMatchObject({ inputPer1M: 0.022 });
    expect(getModelPricing('deepseek-chat')).toMatchObject({ outputPer1M: 0.42 });
  });

  it('estimates request costs from input and output token estimates', () => {
    expect(estimateRequestCostUsd({
      model: 'gpt-5-nano',
      estimatedInputTokens: 1_000_000,
      estimatedOutputTokens: 1_000_000,
    })).toBe(0.45);
  });
});
