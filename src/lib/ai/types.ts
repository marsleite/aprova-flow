export type AiTask = 'chat' | 'weekly-mentoring' | 'parse-edital' | 'planner-daily' | 'smart-schedule' | 'interrogation';

export type AiProvider = 'gemini' | 'openai';

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiResponse {
  text: string;
  provider: AiProvider;
  model: string;
  latencyMs: number;
  usage: AiUsage;
  raw?: unknown;
}

export interface AiTextRequest {
  task: Exclude<AiTask, 'parse-edital'>;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  preferJson?: boolean;
}

export interface AiPdfRequest {
  task: 'parse-edital';
  pdfBase64: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiUsageEvent {
  route: string;
  task: AiTask;
  provider: AiProvider;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  statusCode: number;
  userId?: string;
  errorCode?: string;
}
