import { estimateCostUsd } from './pricing';
import type { AiUsageEvent } from './types';

export function estimateTokensFromText(text: string): number {
  // Aproximação conservadora: ~4 chars/token em PT-BR.
  return Math.max(1, Math.ceil((text || '').length / 4));
}

export function buildUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const inputTokens = Math.max(0, Math.round(params.inputTokens));
  const outputTokens = Math.max(0, Math.round(params.outputTokens));
  const totalTokens = inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd({
      model: params.model,
      inputTokens,
      outputTokens,
    }),
  };
}

export function extractGeminiUsage(response: unknown): {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
} {
  const usage = (response as { usageMetadata?: Record<string, unknown> } | undefined)?.usageMetadata;
  if (!usage) return {};

  const inputTokens = Number(usage.promptTokenCount);
  const outputTokens = Number(usage.candidatesTokenCount);
  const totalTokens = Number(usage.totalTokenCount);

  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : undefined,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : undefined,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : undefined,
  };
}

export function extractOpenAiUsage(response: unknown): {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
} {
  const usage = (response as { usage?: Record<string, unknown> } | undefined)?.usage;
  if (!usage) return {};

  const inputTokens = Number(usage.input_tokens);
  const outputTokens = Number(usage.output_tokens);
  const totalTokens = Number(usage.total_tokens);

  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : undefined,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : undefined,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : undefined,
  };
}

export function logAiUsageEvent(event: AiUsageEvent): void {
  // Logging estruturado para observabilidade.
  console.info('[ai-usage]', JSON.stringify(event));
}
