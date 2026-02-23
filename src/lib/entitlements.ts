export type PlanTier = 'free' | 'pro' | 'premium' | 'admin';
export type AiTaskKey = 'chat' | 'weekly-mentoring' | 'planner-daily' | 'parse-edital';
export type QuotaWindow = 'hour' | 'day' | 'week';

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

const CAPABILITIES_BY_TIER: Record<PlanTier, PlanCapabilities> = {
  free: {
    maxStudyPlans: 1,
    canUseCalendar: false,
    canCreateSimulados: false,
    canUseTreinoRapido: true,
  },
  pro: {
    maxStudyPlans: 5,
    canUseCalendar: true,
    canCreateSimulados: true,
    canUseTreinoRapido: true,
  },
  premium: {
    maxStudyPlans: 20,
    canUseCalendar: true,
    canCreateSimulados: true,
    canUseTreinoRapido: true,
  },
  admin: {
    maxStudyPlans: -1,
    canUseCalendar: true,
    canCreateSimulados: true,
    canUseTreinoRapido: true,
  },
};

const AI_QUOTAS_BY_TIER: Record<Exclude<PlanTier, 'admin'>, AiQuotaByTask> = {
  free: {
    chat: { limit: 80, window: 'day' },
    'weekly-mentoring': { limit: 3, window: 'week' },
    'planner-daily': { limit: 8, window: 'day' },
    'parse-edital': { limit: 5, window: 'week' },
  },
  pro: {
    chat: { limit: 260, window: 'day' },
    'weekly-mentoring': { limit: 10, window: 'week' },
    'planner-daily': { limit: 30, window: 'day' },
    'parse-edital': { limit: 15, window: 'week' },
  },
  premium: {
    chat: { limit: 700, window: 'day' },
    'weekly-mentoring': { limit: 30, window: 'week' },
    'planner-daily': { limit: 80, window: 'day' },
    'parse-edital': { limit: 30, window: 'week' },
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
  const maxPlans = CAPABILITIES_BY_TIER[planTier].maxStudyPlans;
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
