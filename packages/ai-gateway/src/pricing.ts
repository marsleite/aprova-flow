interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cachedInputPer1M?: number;
}

const MODEL_PRICING_PER_1M: Record<string, ModelPricing> = {
  // Gemini (Developer API)
  'gemini-2.5-flash': { inputPer1M: 0.3, outputPer1M: 2.5 },
  'gemini-2.5-flash-lite': { inputPer1M: 0.1, outputPer1M: 0.4 },

  // Qwen / Alibaba Model Studio public list style aliases.
  'qwen-flash': { inputPer1M: 0.022, outputPer1M: 0.216 },
  'qwen3-flash': { inputPer1M: 0.029, outputPer1M: 0.287 },
  'qwen-3.5-flash': { inputPer1M: 0.029, outputPer1M: 0.287 },
  'qwen3.5-flash': { inputPer1M: 0.029, outputPer1M: 0.287 },
  'qwen/qwen3-8b': { inputPer1M: 0.05, outputPer1M: 0.2 },
  'qwen/qwen3-14b': { inputPer1M: 0.08, outputPer1M: 0.24 },
  'qwen/qwen3-30b-a3b': { inputPer1M: 0.08, outputPer1M: 0.29 },

  // DeepSeek
  'deepseek-chat': { inputPer1M: 0.28, outputPer1M: 0.42 },
  'deepseek/deepseek-v4-flash': { inputPer1M: 0.287, outputPer1M: 0.431 },
  'deepseek/deepseek-v4-flash:free': { inputPer1M: 0, outputPer1M: 0 },

  // OpenAI
  'gpt-5-mini': { inputPer1M: 0.25, cachedInputPer1M: 0.025, outputPer1M: 2.0 },
  'gpt-5-nano': { inputPer1M: 0.05, cachedInputPer1M: 0.005, outputPer1M: 0.4 },
};

function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase();
}

export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING_PER_1M[normalizeModelKey(model)] || null;
}

export function estimateRequestCostUsd(params: {
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}): number {
  return estimateCostUsd({
    model: params.model,
    inputTokens: params.estimatedInputTokens,
    outputTokens: params.estimatedOutputTokens,
  });
}

export function estimateCostUsd(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = getModelPricing(params.model);
  if (!pricing) return 0;

  const inputCost = (Math.max(0, params.inputTokens) / 1_000_000) * pricing.inputPer1M;
  const outputCost = (Math.max(0, params.outputTokens) / 1_000_000) * pricing.outputPer1M;

  return Number((inputCost + outputCost).toFixed(8));
}
