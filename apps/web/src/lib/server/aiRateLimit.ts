import { NextResponse } from 'next/server';
import { AiTask } from '@/lib/ai/types';
import { isAdminIdentity } from '@/lib/admin';
import { FeatureCode } from '@aprovamind/domain';
import {
  PlanTier,
  QuotaWindow,
  AiQuotaRule,
  extractPlanTierFromData,
  getAiQuotasForTier,
} from '@/lib/entitlements';
import {
  getFirestoreDocumentWithUserToken,
  setFirestoreDocumentWithUserToken,
} from '@/lib/server/firestoreRest';
import { resolveUserEntitlementsSnapshot } from '@/lib/server/userEntitlements';

type QuotaCheckParams = {
  uid: string;
  email?: string | null;
  idToken: string;
  task: AiTask;
};

type RateLimitWindow = QuotaWindow | 'lifetime';

type QuotaCheckResult =
  | {
      allowed: true;
      headers: Record<string, string>;
      planTier: PlanTier;
    }
  | {
      allowed: false;
      response: NextResponse;
    };

const USER_STATS_COLLECTION = 'user_stats';
const ENTITLEMENT_USAGE_FIELD = 'entitlementUsage';
const ENTITLEMENT_USAGE_PERIODS_FIELD = 'entitlementUsagePeriods';
const ENTITLEMENT_QUOTA_TASK_FEATURES: Partial<Record<AiTask, FeatureCode>> = {
  chat: FeatureCode.ContextualAiChat,
  'weekly-mentoring': FeatureCode.WeeklyMentoring,
  'parse-edital': FeatureCode.EditalParse,
  'explain-answer': FeatureCode.AiExplanations,
};

function isPreconditionConflict(status?: number, error?: string): boolean {
  if (status === 409 || status === 412) return true;
  return status === 400 && (error || '').includes('FAILED_PRECONDITION');
}

function buildWindow(now: Date, window: RateLimitWindow): {
  key: string;
  startMs: number;
  endMs: number;
  resetEpochSeconds: number;
} {
  if (window === 'lifetime') {
    return {
      key: 'lifetime',
      startMs: 0,
      endMs: Number.MAX_SAFE_INTEGER,
      resetEpochSeconds: 0,
    };
  }

  const d = new Date(now);

  if (window === 'hour') {
    d.setUTCMinutes(0, 0, 0);
    const startMs = d.getTime();
    const endMs = startMs + 60 * 60 * 1000;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCHours()).padStart(2, '0')}`;
    return { key, startMs, endMs, resetEpochSeconds: Math.floor(endMs / 1000) };
  }

  if (window === 'week') {
    const dayOfWeek = d.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setUTCDate(d.getUTCDate() - mondayOffset);
    d.setUTCHours(0, 0, 0, 0);
    const startMs = d.getTime();
    const endMs = startMs + 7 * 24 * 60 * 60 * 1000;
    const key = `w-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    return { key, startMs, endMs, resetEpochSeconds: Math.floor(endMs / 1000) };
  }

  if (window === 'month') {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    const startMs = d.getTime();
    const nextMonth = new Date(d);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
    const endMs = nextMonth.getTime();
    const key = `m-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return { key, startMs, endMs, resetEpochSeconds: Math.floor(endMs / 1000) };
  }

  d.setUTCHours(0, 0, 0, 0);
  const startMs = d.getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000;
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { key, startMs, endMs, resetEpochSeconds: Math.floor(endMs / 1000) };
}

function buildRateLimitHeaders(params: {
  task: AiTask;
  planTier: PlanTier;
  limit: number;
  remaining: number;
  resetEpochSeconds: number;
  window: RateLimitWindow;
}): Record<string, string> {
  return {
    'x-ai-plan-tier': params.planTier,
    'x-ratelimit-resource': params.task,
    'x-ratelimit-limit': String(params.limit),
    'x-ratelimit-remaining': String(Math.max(0, params.remaining)),
    'x-ratelimit-reset': String(params.resetEpochSeconds),
    'x-ratelimit-window': params.window,
  };
}

function buildBlockedResponse(params: {
  task: AiTask;
  planTier: PlanTier;
  limit: number;
  resetEpochSeconds: number;
  window: RateLimitWindow;
}): NextResponse {
  if (params.window === 'lifetime') {
    return NextResponse.json(
      {
        error: 'Limite de uso de IA atingido para este recurso.',
        code: 'QUOTA_EXCEEDED',
        task: params.task,
        planTier: params.planTier,
        limit: params.limit,
        retryAfterSeconds: null,
        upgradeHint:
          params.planTier === 'free'
            ? 'Faça upgrade para aumentar sua quota de IA.'
            : undefined,
      },
      {
        status: 429,
        headers: buildRateLimitHeaders({
          task: params.task,
          planTier: params.planTier,
          limit: params.limit,
          remaining: 0,
          resetEpochSeconds: 0,
          window: params.window,
        }),
      }
    );
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const retryAfter = Math.max(1, params.resetEpochSeconds - nowSeconds);
  return NextResponse.json(
    {
      error: 'Limite de uso de IA atingido para este recurso.',
      code: 'QUOTA_EXCEEDED',
      task: params.task,
      planTier: params.planTier,
      limit: params.limit,
      retryAfterSeconds: retryAfter,
      upgradeHint: params.planTier === 'free' ? 'Faça upgrade para aumentar sua quota de IA.' : undefined,
    },
    {
      status: 429,
      headers: {
        ...buildRateLimitHeaders({
          task: params.task,
          planTier: params.planTier,
          limit: params.limit,
          remaining: 0,
          resetEpochSeconds: params.resetEpochSeconds,
          window: params.window,
        }),
        'retry-after': String(retryAfter),
      },
    }
  );
}

function parseUsageMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, raw]) => [key, Math.max(0, Math.floor(Number(raw) || 0))])
        .filter(([, raw]) => Number.isFinite(raw))
    );
  } catch {
    return {};
  }
}

function parseUsagePeriodMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, raw]) => typeof raw === 'string' && raw.trim().length > 0)
        .map(([key, raw]) => [key, String(raw)])
    );
  } catch {
    return {};
  }
}

function getMonthBucket(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function enforceUserStatsQuota(params: {
  uid: string;
  idToken: string;
  task: AiTask;
  planTier: PlanTier;
  usageKey: string;
  limit: number;
  window: RateLimitWindow;
  bucket: string;
  resetEpochSeconds: number;
}): Promise<QuotaCheckResult> {
  const current = await getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: params.uid,
    idToken: params.idToken,
  });

  if (!current.ok) {
    console.warn('[ai-rate-limit] usage read failed:', current.status, current.error);
    return {
      allowed: true,
      planTier: params.planTier,
      headers: {
        ...buildRateLimitHeaders({
          task: params.task,
          planTier: params.planTier,
          limit: params.limit,
          remaining: params.limit,
          resetEpochSeconds: params.resetEpochSeconds,
          window: params.window,
        }),
        'x-ratelimit-store-error': 'read_failed',
      },
    };
  }

  const usageMap = parseUsageMap(current.data?.[ENTITLEMENT_USAGE_FIELD]);
  const usagePeriods = parseUsagePeriodMap(current.data?.[ENTITLEMENT_USAGE_PERIODS_FIELD]);
  const storedBucket = usagePeriods[params.usageKey];
  const currentCount =
    !storedBucket || storedBucket === params.bucket
      ? Math.max(0, Number(usageMap[params.usageKey] || 0))
      : 0;

  if (currentCount >= params.limit) {
    return {
      allowed: false,
      response: buildBlockedResponse({
        task: params.task,
        planTier: params.planTier,
        limit: params.limit,
        resetEpochSeconds: params.resetEpochSeconds,
        window: params.window,
      }),
    };
  }

  const nextUsageMap = {
    ...usageMap,
    [params.usageKey]: currentCount + 1,
  };
  const nextUsagePeriods = {
    ...usagePeriods,
    [params.usageKey]: params.bucket,
  };

  const updated = await setFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: params.uid,
    idToken: params.idToken,
    currentUpdateTime: current.exists ? current.updateTime : undefined,
    data: {
      [ENTITLEMENT_USAGE_FIELD]: JSON.stringify(nextUsageMap),
      [ENTITLEMENT_USAGE_PERIODS_FIELD]: JSON.stringify(nextUsagePeriods),
      usageUpdatedAt: new Date().toISOString(),
    },
  });

  if (!updated.ok) {
    console.warn('[ai-rate-limit] usage write failed:', updated.status, updated.error);
    return {
      allowed: true,
      planTier: params.planTier,
      headers: {
        ...buildRateLimitHeaders({
          task: params.task,
          planTier: params.planTier,
          limit: params.limit,
          remaining: Math.max(0, params.limit - (currentCount + 1)),
          resetEpochSeconds: params.resetEpochSeconds,
          window: params.window,
        }),
        'x-ratelimit-store-error': 'update_failed',
      },
    };
  }

  return {
    allowed: true,
    planTier: params.planTier,
    headers: buildRateLimitHeaders({
      task: params.task,
      planTier: params.planTier,
      limit: params.limit,
      remaining: Math.max(0, params.limit - (currentCount + 1)),
      resetEpochSeconds: params.resetEpochSeconds,
      window: params.window,
    }),
  };
}

async function enforceEntitlementFeatureQuota(
  params: QuotaCheckParams,
  featureCode: FeatureCode
): Promise<QuotaCheckResult | null> {
  const entitlements = await resolveUserEntitlementsSnapshot({
    uid: params.uid,
    email: params.email,
    idToken: params.idToken,
  });

  const feature = entitlements.features[featureCode];
  if (!feature) {
    return null;
  }

  const planTier = entitlements.effectivePlan as PlanTier;

  if (feature.mode !== 'quota') {
    return {
      allowed: true,
      planTier,
      headers: {
        'x-ai-plan-tier': planTier,
        'x-ratelimit-resource': params.task,
        'x-ratelimit-limit': 'unlimited',
        'x-ratelimit-remaining': 'unlimited',
        'x-ratelimit-reset': '0',
        'x-ratelimit-window': 'none',
      },
    };
  }

  const now = new Date();
  const currentBucket =
    feature.period === 'lifetime' ? 'lifetime' : getMonthBucket(now);
  const window: RateLimitWindow =
    feature.period === 'lifetime' ? 'lifetime' : 'month';
  const resetEpochSeconds =
    feature.period === 'lifetime'
      ? 0
      : buildWindow(now, 'month').resetEpochSeconds;

  return enforceUserStatsQuota({
    uid: params.uid,
    idToken: params.idToken,
    task: params.task,
    planTier,
    usageKey: featureCode,
    limit: feature.limit,
    window,
    bucket: currentBucket,
    resetEpochSeconds,
  });
}

export async function resolvePlanTier(params: {
  uid: string;
  email?: string | null;
  idToken: string;
}): Promise<PlanTier> {
  if (isAdminIdentity({ uid: params.uid, email: params.email })) {
    return 'admin';
  }

  const stats = await getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: params.uid,
    idToken: params.idToken,
  });

  if (!stats.ok || !stats.exists || !stats.data) {
    return 'free';
  }

  return extractPlanTierFromData(stats.data as Record<string, unknown>);
}

export async function enforceAiTaskQuota(params: QuotaCheckParams): Promise<QuotaCheckResult> {
  const mappedFeature = ENTITLEMENT_QUOTA_TASK_FEATURES[params.task];
  if (mappedFeature) {
    const entitlementQuota = await enforceEntitlementFeatureQuota(
      params,
      mappedFeature
    );
    if (entitlementQuota) {
      return entitlementQuota;
    }
  }

  const planTier = await resolvePlanTier({
    uid: params.uid,
    email: params.email,
    idToken: params.idToken,
  });

  if (planTier === 'admin') {
    return {
      allowed: true,
      planTier,
      headers: {
        'x-ai-plan-tier': 'admin',
        'x-ratelimit-resource': params.task,
        'x-ratelimit-limit': 'unlimited',
        'x-ratelimit-remaining': 'unlimited',
        'x-ratelimit-window': 'none',
      },
    };
  }

  const tierQuotas = getAiQuotasForTier(planTier);
  if (!tierQuotas) {
    return {
      allowed: true,
      planTier,
      headers: {
        'x-ai-plan-tier': planTier,
        'x-ratelimit-resource': params.task,
        'x-ratelimit-limit': 'unlimited',
        'x-ratelimit-remaining': 'unlimited',
        'x-ratelimit-window': 'none',
      },
    };
  }

  const rule: AiQuotaRule = tierQuotas[params.task as keyof typeof tierQuotas];
  const window = buildWindow(new Date(), rule.window);

  return enforceUserStatsQuota({
    uid: params.uid,
    idToken: params.idToken,
    task: params.task,
    planTier,
    usageKey: params.task,
    limit: rule.limit,
    window: rule.window,
    bucket: window.key,
    resetEpochSeconds: window.resetEpochSeconds,
  });
}
