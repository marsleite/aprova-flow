import {
  DEFAULT_ENTITLEMENT_POLICY,
  EntitlementMode,
  FeatureCode,
  PlanCode,
} from '@aprovamind/domain';

export type PlanTier = 'free' | 'pro' | 'premium' | 'admin';
export type AiTaskKey = 'chat' | 'weekly-mentoring' | 'planner-daily' | 'parse-edital' | 'smart-schedule' | 'interrogation' | 'predictive-exam' | 'explain-answer' | 'error-diagnosis';
export type QuotaWindow = 'hour' | 'day' | 'week' | 'month';

export interface PlanCapabilities {
  maxStudyPlans: number; // -1 = ilimitado
  canUseCalendar: boolean;
  canCreateSimulados: boolean;
  canUseTreinoRapido: boolean;
}

export interface AiQuotaRule {
  limit: number;
  window: QuotaWindow;
}

export type AiQuotaByTask = Record<AiTaskKey, AiQuotaRule>;

function getCanonicalPlanCapabilities(planCode: PlanCode): PlanCapabilities {
  const rules = DEFAULT_ENTITLEMENT_POLICY.plans[planCode].features;
  const activePlans = rules[FeatureCode.ActivePlans];
  const simulationsCustom = rules[FeatureCode.SimulationsCustom];
  const treinoRapido = rules[FeatureCode.QuestionsPracticeBasic];

  return {
    maxStudyPlans:
      activePlans.mode === EntitlementMode.Quota ? activePlans.limit : 0,
    canUseCalendar: planCode !== PlanCode.Free,
    canCreateSimulados:
      simulationsCustom.mode === EntitlementMode.Boolean
        ? simulationsCustom.enabled
        : false,
    canUseTreinoRapido:
      treinoRapido.mode === EntitlementMode.Boolean
        ? treinoRapido.enabled
        : treinoRapido.limit > 0,
  };
}

const CAPABILITIES_BY_TIER: Record<PlanTier, PlanCapabilities> = {
  free: getCanonicalPlanCapabilities(PlanCode.Free),
  pro: getCanonicalPlanCapabilities(PlanCode.Pro),
  premium: getCanonicalPlanCapabilities(PlanCode.Premium),
  admin: {
    maxStudyPlans: -1,
    canUseCalendar: true,
    canCreateSimulados: true,
    canUseTreinoRapido: true,
  },
};

const AI_QUOTAS_BY_TIER: Record<Exclude<PlanTier, 'admin'>, AiQuotaByTask> = {
  free: {
    chat: { limit: 5, window: 'month' },
    'weekly-mentoring': { limit: 0, window: 'month' },
    'planner-daily': { limit: 8, window: 'day' },
    'parse-edital': { limit: 5, window: 'week' },
    'smart-schedule': { limit: 10, window: 'week' },
    'interrogation': { limit: 15, window: 'day' },
    'predictive-exam': { limit: 5, window: 'day' },
    'explain-answer': { limit: 3, window: 'month' },
    'error-diagnosis': { limit: 0, window: 'day' },
  },
  pro: {
    chat: { limit: 60, window: 'month' },
    'weekly-mentoring': { limit: 4, window: 'month' },
    'planner-daily': { limit: 30, window: 'day' },
    'parse-edital': { limit: 15, window: 'week' },
    'smart-schedule': { limit: 30, window: 'week' },
    'interrogation': { limit: 50, window: 'day' },
    'predictive-exam': { limit: 20, window: 'day' },
    'explain-answer': { limit: 120, window: 'month' },
    'error-diagnosis': { limit: 5, window: 'day' },
  },
  premium: {
    chat: { limit: 150, window: 'month' },
    'weekly-mentoring': { limit: 8, window: 'month' },
    'planner-daily': { limit: 80, window: 'day' },
    'parse-edital': { limit: 30, window: 'week' },
    'smart-schedule': { limit: 60, window: 'week' },
    'interrogation': { limit: 100, window: 'day' },
    'predictive-exam': { limit: 50, window: 'day' },
    'explain-answer': { limit: 300, window: 'month' },
    'error-diagnosis': { limit: 15, window: 'day' },
  },
};

const TIER_CANDIDATE_FIELDS = ['planTier', 'aiPlanTier', 'subscriptionTier', 'planType', 'tier'] as const;

export function normalizePlanTier(value: string | undefined | null): PlanTier {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'premium') return 'premium';
  if (normalized === 'pro') return 'pro';
  return 'free';
}

export function getCapabilitiesForTier(planTier: PlanTier): PlanCapabilities {
  return CAPABILITIES_BY_TIER[planTier];
}

export function getAiQuotasForTier(planTier: PlanTier): AiQuotaByTask | null {
  if (planTier === 'admin') return null;
  return AI_QUOTAS_BY_TIER[planTier];
}

export function isUnlimited(value: number): boolean {
  return value < 0;
}

export function canCreateMorePlans(planTier: PlanTier, currentPlansCount: number): boolean {
  const maxPlans = getCapabilitiesForTier(planTier).maxStudyPlans;
  if (isUnlimited(maxPlans)) return true;
  return currentPlansCount < maxPlans;
}

export function extractPlanTierFromData(
  data: Record<string, unknown> | null | undefined
): PlanTier {
  if (!data) return 'free';
  for (const key of TIER_CANDIDATE_FIELDS) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return normalizePlanTier(value);
    }
  }
  return 'free';
}
