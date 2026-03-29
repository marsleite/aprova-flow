/**
 * Re-export from shared @aprovamind/ai-gateway package.
 *
 * All AI logic now lives in packages/ai-gateway.
 * This barrel keeps the existing `@/lib/ai` import paths working for
 * consumers inside apps/web without any code changes.
 */
export { runAiText, runAiPdf } from '@aprovamind/ai-gateway';
export { extractFirstJsonObject, parseJsonFromModelText } from '@aprovamind/ai-gateway';
export { estimateTokensFromText, buildUsage, extractGeminiUsage, extractOpenAiUsage, logAiUsageEvent } from '@aprovamind/ai-gateway';
export type { AiTask, AiProvider, AiUsage, AiResponse, AiTextRequest, AiPdfRequest, AiUsageEvent } from '@aprovamind/ai-gateway';
