export type AiCapability =
  | 'daily_plan'
  | 'focus_allocation'
  | 'next_session'
  | 'chat'
  | 'weekly_mentoring'
  | 'error_diagnosis'
  | 'explain_answer'
  | 'smart_schedule';

export type AiCapabilityState =
  | 'enabled'
  | 'disabled'
  | 'limited'
  | 'misconfigured'
  | 'provider_unavailable'
  | 'insufficient_data'
  | 'unexpected_failure';

export type AiNextAction =
  | 'register_activity'
  | 'manage_editais'
  | 'generate_fallback'
  | 'retry_later'
  | 'upgrade_or_wait'
  | 'continue_without_ai';

export interface AiCapabilityResponse {
  capability: AiCapability;
  state: AiCapabilityState;
  message: string;
  nextActions: AiNextAction[];
  retryAfterSeconds?: number;
  usageRemaining?: number;
}

export interface AiFailureInput {
  capability: AiCapability;
  error?: unknown;
  hasRequiredContext?: boolean;
  retryAfterSeconds?: number;
  usageRemaining?: number;
}
