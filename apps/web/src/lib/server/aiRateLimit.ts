import { NextResponse } from 'next/server';
import { AiTask } from '@/lib/ai/types';
import { isAdminIdentity } from '@/lib/admin';
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

type QuotaCheckParams = {
  uid: string;
  email?: string | null;
  idToken: string;
  task: AiTask;
};

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
const AI_RATE_LIMIT_COLLECTION = 'ai_rate_limits';

function isPreconditionConflict(status?: number, error?: string): boolean {
  if (status === 409 || status === 412) return true;
  return status === 400 && (error || '').includes('FAILED_PRECONDITION');
}

function buildWindow(now: Date, window: QuotaWindow): {
  key: string;
  startMs: number;
  endMs: number;
  resetEpochSeconds: number;
} {
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
  window: QuotaWindow;
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
  window: QuotaWindow;
}): NextResponse {
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
  const now = new Date();
  const window = buildWindow(now, rule.window);
  const documentId = `${params.uid}_${params.task}_${window.key}`;

  // Retry curto para concorrência otimista (requisições paralelas).
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await getFirestoreDocumentWithUserToken({
      collection: AI_RATE_LIMIT_COLLECTION,
      documentId,
      idToken: params.idToken,
    });

    if (!current.ok) {
      console.warn('[ai-rate-limit] read failed:', current.status, current.error);
      return {
        allowed: true,
        planTier,
        headers: {
          ...buildRateLimitHeaders({
            task: params.task,
            planTier,
            limit: rule.limit,
            remaining: rule.limit,
            resetEpochSeconds: window.resetEpochSeconds,
            window: rule.window,
          }),
          'x-ratelimit-store-error': 'read_failed',
        },
      };
    }

    if (!current.exists) {
      const created = await setFirestoreDocumentWithUserToken({
        collection: AI_RATE_LIMIT_COLLECTION,
        documentId,
        idToken: params.idToken,
        createOnly: true,
        data: {
          userId: params.uid,
          task: params.task,
          planTier,
          window: rule.window,
          windowKey: window.key,
          windowStartMs: window.startMs,
          windowEndMs: window.endMs,
          count: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      });

      if (created.ok) {
        return {
          allowed: true,
          planTier,
          headers: buildRateLimitHeaders({
            task: params.task,
            planTier,
            limit: rule.limit,
            remaining: Math.max(0, rule.limit - 1),
            resetEpochSeconds: window.resetEpochSeconds,
            window: rule.window,
          }),
        };
      }

      if (isPreconditionConflict(created.status, created.error)) continue;

      console.warn('[ai-rate-limit] create failed:', created.status, created.error);
      return {
        allowed: true,
        planTier,
        headers: {
          ...buildRateLimitHeaders({
            task: params.task,
            planTier,
            limit: rule.limit,
            remaining: rule.limit,
            resetEpochSeconds: window.resetEpochSeconds,
            window: rule.window,
          }),
          'x-ratelimit-store-error': 'create_failed',
        },
      };
    }

    const currentCount = Math.max(0, Number(current.data?.count || 0));
    const currentWindowEnd = Number(current.data?.windowEndMs || window.endMs);
    const needsReset = Date.now() >= currentWindowEnd;

    if (!needsReset && currentCount >= rule.limit) {
      return {
        allowed: false,
        response: buildBlockedResponse({
          task: params.task,
          planTier,
          limit: rule.limit,
          resetEpochSeconds: Math.floor(currentWindowEnd / 1000),
          window: rule.window,
        }),
      };
    }

    const nextCount = needsReset ? 1 : currentCount + 1;

    const updated = await setFirestoreDocumentWithUserToken({
      collection: AI_RATE_LIMIT_COLLECTION,
      documentId,
      idToken: params.idToken,
      currentUpdateTime: current.updateTime,
      data: {
        userId: params.uid,
        task: params.task,
        planTier,
        window: rule.window,
        windowKey: window.key,
        windowStartMs: window.startMs,
        windowEndMs: window.endMs,
        count: nextCount,
        updatedAt: now.toISOString(),
      },
    });

    if (updated.ok) {
      return {
        allowed: true,
        planTier,
        headers: buildRateLimitHeaders({
          task: params.task,
          planTier,
          limit: rule.limit,
          remaining: Math.max(0, rule.limit - nextCount),
          resetEpochSeconds: window.resetEpochSeconds,
          window: rule.window,
        }),
      };
    }

    if (isPreconditionConflict(updated.status, updated.error)) continue;

    console.warn('[ai-rate-limit] update failed:', updated.status, updated.error);
    return {
      allowed: true,
      planTier,
      headers: {
        ...buildRateLimitHeaders({
          task: params.task,
          planTier,
          limit: rule.limit,
          remaining: Math.max(0, rule.limit - currentCount),
          resetEpochSeconds: window.resetEpochSeconds,
          window: rule.window,
        }),
        'x-ratelimit-store-error': 'update_failed',
      },
    };
  }

  return {
    allowed: true,
    planTier,
    headers: {
      ...buildRateLimitHeaders({
        task: params.task,
        planTier,
        limit: rule.limit,
        remaining: rule.limit,
        resetEpochSeconds: window.resetEpochSeconds,
        window: rule.window,
      }),
      'x-ratelimit-store-error': 'conflict_retries_exceeded',
    },
  };
}
