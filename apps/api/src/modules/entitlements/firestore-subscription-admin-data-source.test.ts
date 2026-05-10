import assert from 'node:assert/strict';
import test from 'node:test';
import { PlanCode, SubscriptionStatus } from '@aprovamind/domain';
import { FirestoreSubscriptionAdminDataSource } from './firestore-subscription-admin-data-source';

test('FirestoreSubscriptionAdminDataSource updates plan, status and usage in user_stats', async () => {
  let savedPayload: Record<string, string> | null = null;

  const dataSource = new FirestoreSubscriptionAdminDataSource({
    idToken: 'token',
    identity: { uid: 'admin-1', email: 'marsleite@gmail.com' },
    loadUserStats: async () => ({
      ok: true,
      exists: true,
      data: {
        planTier: 'pro',
        subscriptionStatus: 'active',
        entitlementUsage: JSON.stringify({
          ai_explanations: 4,
        }),
      },
    }),
    saveUserStats: async ({ data }) => {
      savedPayload = data;
      return { ok: true, status: 200 };
    },
  });

  const result = await dataSource.updateUserSubscriptionState({
    userId: 'user-1',
    plan: PlanCode.Pro,
    status: SubscriptionStatus.PastDue,
    usage: {
      ai_explanations: 12,
      contextual_ai_chat: 7,
    },
  });

  assert.equal(result.found, true);
  assert.ok(savedPayload);
  const payload = savedPayload as Record<string, string>;
  assert.equal(payload.planTier, 'pro');
  assert.equal(payload.subscriptionStatus, 'past_due');
  assert.equal(
    payload.entitlementUsage,
    JSON.stringify({
      ai_explanations: 12,
      contextual_ai_chat: 7,
    })
  );
  assert.equal(
    payload.entitlementUsagePeriods,
    JSON.stringify({
      ai_explanations: `${new Date().getUTCFullYear()}-${String(
        new Date().getUTCMonth() + 1
      ).padStart(2, '0')}`,
      contextual_ai_chat: `${new Date().getUTCFullYear()}-${String(
        new Date().getUTCMonth() + 1
      ).padStart(2, '0')}`,
    })
  );
  assert.equal(result.subscription.plan, 'pro');
  assert.equal(result.subscription.status, 'active');
});

test('FirestoreSubscriptionAdminDataSource resets usage when requested', async () => {
  let savedPayload: Record<string, string> | null = null;

  const dataSource = new FirestoreSubscriptionAdminDataSource({
    idToken: 'token',
    identity: { uid: 'admin-1', email: 'marsleite@gmail.com' },
    loadUserStats: async () => ({
      ok: true,
      exists: false,
    }),
    saveUserStats: async ({ data }) => {
      savedPayload = data;
      return { ok: true, status: 200 };
    },
  });

  const result = await dataSource.updateUserSubscriptionState({
    userId: 'user-2',
    resetUsage: true,
  });

  assert.equal(result.found, true);
  assert.ok(savedPayload);
  const payload = savedPayload as Record<string, string>;
  assert.equal(payload.entitlementUsage, '{}');
  assert.equal(payload.entitlementUsagePeriods, '{}');
  assert.equal(result.subscription.plan, 'free');
  assert.equal(result.subscription.status, 'active');
});
