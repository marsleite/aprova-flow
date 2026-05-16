export type AiEconomyTask =
  | 'chat'
  | 'planner-daily'
  | 'smart-schedule'
  | 'weekly-mentoring'
  | 'error-diagnosis'
  | 'explain-answer'
  | 'parse-edital'
  | 'interrogation'
  | 'predictive-exam';

export type AiBudgetTier = 'free' | 'tester' | 'pro' | 'admin';

export type AiDecisionStatus = 'success' | 'fallback' | 'failed' | 'blocked_by_budget';

export type AiEconomyProvider = 'gemini' | 'openai-compatible' | 'local-heuristic';

export interface AiDecisionUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiDecisionRequest {
  task: AiEconomyTask;
  userId?: string;
  route: string;
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  preferJson?: boolean;
  budgetTier: AiBudgetTier;
  allowFallback: boolean;
  requestId?: string;
}

export interface AiDecisionResponse {
  status: AiDecisionStatus;
  text?: string;
  provider?: AiEconomyProvider;
  model?: string;
  latencyMs: number;
  fallbackUsed: boolean;
  budgetBlocked: boolean;
  userMessage: string;
  usage: AiDecisionUsage;
  errorCode?: string;
}

export type AiBudgetWindow = 'day' | 'month';

export interface AiBudgetLimit {
  scope: 'user' | 'global';
  window: AiBudgetWindow;
  limitUsd: number;
  consumedUsd: number;
  reservedUsd: number;
  remainingUsd: number;
}

export interface AiBudgetDecision {
  allowed: boolean;
  task: AiEconomyTask;
  estimatedRequestCostUsd: number;
  limits: AiBudgetLimit[];
  blockReason?: 'user_daily_budget' | 'global_monthly_budget' | 'missing_budget_policy';
  retryAfterSeconds?: number;
}

export type AiUsageEventStatus = 'success' | 'failed' | 'fallback' | 'blocked_by_budget';

export interface AiEconomyUsageEvent {
  eventId?: string;
  userId?: string;
  route: string;
  task: AiEconomyTask;
  provider?: string;
  model?: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  status: AiUsageEventStatus;
  fallbackUsed: boolean;
  budgetBlocked: boolean;
  errorCode?: string;
  createdAt?: string;
}
