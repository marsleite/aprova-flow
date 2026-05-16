export type AiTask = 'chat' | 'weekly-mentoring' | 'parse-edital' | 'planner-daily' | 'smart-schedule' | 'interrogation' | 'predictive-exam' | 'explain-answer' | 'error-diagnosis';

export type AiProvider = 'gemini' | 'openai' | 'openai-compatible' | 'openrouter' | 'local-heuristic';

export type AiDecisionStatus = 'success' | 'fallback' | 'failed' | 'blocked_by_budget';

export type AiBudgetTier = 'free' | 'tester' | 'pro' | 'admin';

export type AiProviderQualityTier = 'economical' | 'balanced' | 'premium';

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
  status?: AiDecisionStatus;
  fallbackUsed?: boolean;
  budgetBlocked?: boolean;
  userMessage?: string;
  errorCode?: string;
  budgetDecision?: AiBudgetDecision;
  raw?: unknown;
}

export interface AiTextRequest {
  task: Exclude<AiTask, 'parse-edital'>;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  preferJson?: boolean;
  thinkingBudget?: number;
  userId?: string;
  route?: string;
  budgetTier?: AiBudgetTier;
  allowFallback?: boolean;
  requestId?: string;
  budget?: Partial<{
    userDailyBudgetUsd: number;
    globalMonthlyBudgetUsd: number;
    userDailyConsumedUsd: number;
    globalMonthlyConsumedUsd: number;
    userDailyReservedUsd: number;
    globalMonthlyReservedUsd: number;
  }>;
}

export interface AiPdfRequest {
  task: 'parse-edital';
  pdfBase64: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  userId?: string;
  route?: string;
  budgetTier?: AiBudgetTier;
  allowFallback?: boolean;
  requestId?: string;
  budget?: Partial<{
    userDailyBudgetUsd: number;
    globalMonthlyBudgetUsd: number;
    userDailyConsumedUsd: number;
    globalMonthlyConsumedUsd: number;
    userDailyReservedUsd: number;
    globalMonthlyReservedUsd: number;
  }>;
}

export interface AiProviderProfile {
  provider: AiProvider;
  model: string;
  taskScope: AiTask[];
  qualityTier: AiProviderQualityTier;
  priceInputPerMillion?: number;
  priceOutputPerMillion?: number;
  enabled: boolean;
  fallbackProvider?: AiProvider;
}

export interface AiTaskPolicy {
  task: AiTask;
  provider: AiProvider;
  model: string;
  maxOutputTokens: number;
  allowFallback: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  qualityTier: AiProviderQualityTier;
}

export interface AiBudgetLimit {
  scope: 'user' | 'global';
  window: 'day' | 'month';
  limitUsd: number;
  consumedUsd: number;
  reservedUsd: number;
  remainingUsd: number;
}

export interface AiBudgetDecision {
  allowed: boolean;
  task: AiTask;
  estimatedRequestCostUsd: number;
  limits: AiBudgetLimit[];
  blockReason?: 'user_daily_budget' | 'global_monthly_budget' | 'missing_budget_policy';
  retryAfterSeconds?: number;
}

export interface AiUsageEvent {
  route: string;
  task: AiTask;
  provider?: AiProvider | string;
  model?: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  status?: AiDecisionStatus;
  fallbackUsed?: boolean;
  budgetBlocked?: boolean;
  statusCode: number;
  userId?: string;
  errorCode?: string;
}
