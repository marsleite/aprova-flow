export type DailyPlanEligibilityStatus =
  | 'eligible'
  | 'missing_data'
  | 'missing_active_edital'
  | 'ai_unavailable'
  | 'usage_limited'
  | 'blocked';

export type DailyPlanNextAction =
  | 'register_activity'
  | 'manage_editais'
  | 'retry_later'
  | 'generate_fallback'
  | 'continue_without_ai';

export interface DailyPlanEligibility {
  status: DailyPlanEligibilityStatus;
  canGenerate: boolean;
  canGenerateFallback: boolean;
  missingRequirements: string[];
  nextActions: DailyPlanNextAction[];
  evaluatedAt: string;
}

export type DailyPlanGenerationMode =
  | 'ai_generated'
  | 'deterministic_fallback'
  | 'manual_guided';

export interface DailyPlanItem {
  subject: string;
  durationMinutes: number;
  goal: string;
}

export type DailyPlanResultStatus =
  | 'ready'
  | 'fallback_ready'
  | 'failed_recoverable';

export interface DailyPlanResult {
  status: DailyPlanResultStatus;
  generationMode?: DailyPlanGenerationMode;
  items: DailyPlanItem[];
  rationale?: string;
  userMessage: string;
  sourceEligibility: DailyPlanEligibility;
}
