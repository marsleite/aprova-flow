import { FeatureCode } from '@aprovamind/domain';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const isAdminIdentity = vi.fn();
const getFirestoreDocumentWithUserToken = vi.fn();
const setFirestoreDocumentWithUserToken = vi.fn();
const saveProductUsageEvent = vi.fn();
const resolveUserEntitlementsSnapshot = vi.fn();

vi.mock('@/lib/admin', () => ({
  isAdminIdentity,
}));

vi.mock('@/lib/server/firestoreRest', () => ({
  getFirestoreDocumentWithUserToken,
  setFirestoreDocumentWithUserToken,
}));

vi.mock('@/lib/server/productEventStore', () => ({
  saveProductUsageEvent,
}));

vi.mock('@/lib/server/userEntitlements', () => ({
  resolveUserEntitlementsSnapshot,
}));

let enforceAiTaskQuota: typeof import('@/lib/server/aiRateLimit').enforceAiTaskQuota;

beforeAll(async () => {
  ({ enforceAiTaskQuota } = await import('@/lib/server/aiRateLimit'));
});

describe('enforceAiTaskQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    isAdminIdentity.mockReturnValue(false);
    resolveUserEntitlementsSnapshot.mockResolvedValue({
      effectivePlan: 'free',
      features: {},
    });
  });

  it('records product events when an AI task is blocked by quota exhaustion', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T12:00:00.000Z'));

    getFirestoreDocumentWithUserToken.mockResolvedValue({
      ok: true,
      exists: true,
      data: {
        planTier: 'free',
        entitlementUsage: JSON.stringify({
          'planner-daily': 8,
        }),
        entitlementUsagePeriods: JSON.stringify({
          'planner-daily': '2026-04-08',
        }),
      },
    });

    const result = await enforceAiTaskQuota({
      uid: 'user-1',
      email: 'user@example.com',
      idToken: 'token-1',
      task: 'planner-daily',
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) return;

    expect(result.response.status).toBe(429);
    await expect(result.response.json()).resolves.toMatchObject({
      code: 'QUOTA_EXCEEDED',
      task: 'planner-daily',
      planTier: 'free',
      featureCode: FeatureCode.AdaptiveDailyPlan,
      recommendedPlan: 'pro',
      limit: 8,
      window: 'day',
      upgradeHint:
        'Faça upgrade para o Pro e tenha acesso completo a todas as features de IA.',
    });
    expect(setFirestoreDocumentWithUserToken).not.toHaveBeenCalled();
    expect(saveProductUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'ai_quota_exhausted',
        actorUserId: 'user-1',
        userId: 'user-1',
        task: 'planner-daily',
        featureCode: FeatureCode.AdaptiveDailyPlan,
        recommendedPlan: 'pro',
        planTier: 'free',
        route: '/api/planner-daily',
        surface: 'ai_rate_limit',
        metadata: expect.objectContaining({
          limit: 8,
          window: 'day',
        }),
      }),
      'token-1'
    );
  });
});
