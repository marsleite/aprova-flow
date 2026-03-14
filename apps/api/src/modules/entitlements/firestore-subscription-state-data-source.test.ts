import assert from 'node:assert/strict';
import test from 'node:test';
import { PlanCode, SubscriptionStatus } from '@aprovamind/domain';
import { FirestoreSubscriptionStateDataSource } from './firestore-subscription-state-data-source';

test('FirestoreSubscriptionStateDataSource falls back to free active when user_stats is missing', async () => {
  const dataSource = new FirestoreSubscriptionStateDataSource({
    idToken: 'token',
    identity: { uid: 'user-1', email: 'user-1@example.com' },
    loadUserStats: async () => ({
      ok: true,
      exists: false,
      status: 404,
    }),
    isAdminIdentity: () => false,
  });

  const result = await dataSource.getUserSubscriptionState({
    userId: 'user-1',
    email: 'user-1@example.com',
  });

  assert.equal(result.found, true);
  if (!result.found) return;

  assert.equal(result.subscription.plan, PlanCode.Free);
  assert.equal(result.subscription.status, SubscriptionStatus.Active);
});

test('FirestoreSubscriptionStateDataSource maps plan, status and usage from user_stats', async () => {
  const dataSource = new FirestoreSubscriptionStateDataSource({
    idToken: 'token',
    identity: { uid: 'user-2', email: 'user-2@example.com' },
    loadUserStats: async () => ({
      ok: true,
      exists: true,
      status: 200,
      data: {
        planTier: 'premium',
        subscriptionStatus: 'past_due',
        entitlementUsage: JSON.stringify({
          ai_explanations: 7,
          contextual_ai_chat: 3,
        }),
        entitlementUsagePeriods: JSON.stringify({
          ai_explanations: `${new Date().getUTCFullYear()}-${String(
            new Date().getUTCMonth() + 1
          ).padStart(2, '0')}`,
          contextual_ai_chat: `${new Date().getUTCFullYear()}-${String(
            new Date().getUTCMonth() + 1
          ).padStart(2, '0')}`,
        }),
      },
    }),
    isAdminIdentity: () => false,
  });

  const result = await dataSource.getUserSubscriptionState({
    userId: 'user-2',
    email: 'user-2@example.com',
  });

  assert.equal(result.found, true);
  if (!result.found) return;

  assert.equal(result.subscription.plan, PlanCode.Premium);
  assert.equal(result.subscription.status, SubscriptionStatus.PastDue);
  assert.deepEqual(result.subscription.usage, {
    ai_explanations: 7,
    contextual_ai_chat: 3,
  });
});

test('FirestoreSubscriptionStateDataSource ignores stale monthly usage buckets', async () => {
  const dataSource = new FirestoreSubscriptionStateDataSource({
    idToken: 'token',
    identity: { uid: 'user-3', email: 'user-3@example.com' },
    loadUserStats: async () => ({
      ok: true,
      exists: true,
      status: 200,
      data: {
        planTier: 'pro',
        subscriptionStatus: 'active',
        entitlementUsage: JSON.stringify({
          ai_explanations: 9,
          edital_parse: 2,
        }),
        entitlementUsagePeriods: JSON.stringify({
          ai_explanations: '2026-02',
          edital_parse: '2026-02',
        }),
      },
    }),
    isAdminIdentity: () => false,
  });

  const result = await dataSource.getUserSubscriptionState({
    userId: 'user-3',
    email: 'user-3@example.com',
  });

  assert.equal(result.found, true);
  if (!result.found) return;

  assert.deepEqual(result.subscription.usage, undefined);
});

test('FirestoreSubscriptionStateDataSource grants premium active access to admin identities', async () => {
  const dataSource = new FirestoreSubscriptionStateDataSource({
    idToken: 'token',
    identity: { uid: 'admin-user', email: 'admin@example.com' },
    loadUserStats: async () => {
      throw new Error('loadUserStats should not be called for admins');
    },
    isAdminIdentity: () => true,
  });

  const result = await dataSource.getUserSubscriptionState({
    userId: 'admin-user',
    email: 'admin@example.com',
  });

  assert.equal(result.found, true);
  if (!result.found) return;

  assert.equal(result.subscription.plan, PlanCode.Premium);
  assert.equal(result.subscription.status, SubscriptionStatus.Active);
});
