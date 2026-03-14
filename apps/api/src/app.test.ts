import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './app';
import type { SubscriptionStateDataSource } from '@aprovamind/application/ports/SubscriptionStateDataSource';
import { PlanCode, SubscriptionStatus } from '@aprovamind/domain';
import type { SubscriptionAdminDataSource } from './modules/entitlements/firestore-subscription-admin-data-source';

test('GET /health returns ok', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      service: 'aprovamind-api',
      status: 'ok',
    });
  } finally {
    await app.close();
  }
});

test('GET /entitlements/scenarios exposes manual scenarios for testing', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/scenarios',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.ok(Array.isArray(body.scenarios));
    assert.ok(body.scenarios.some((item: { userId: string }) => item.userId === 'free-user'));
    assert.ok(body.scenarios.some((item: { userId: string }) => item.userId === 'premium-user'));
  } finally {
    await app.close();
  }
});

test('GET /entitlements/me returns the entitlement snapshot for a test user', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me?userId=pro-user',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'pro-user');
    assert.equal(body.entitlements.catalogPlan, 'pro');
    assert.equal(body.entitlements.effectivePlan, 'pro');
    assert.equal(body.entitlements.features.subject_health_full.enabled, true);
    assert.equal(body.entitlements.features.multi_edital.enabled, false);
  } finally {
    await app.close();
  }
});

test('GET /entitlements/me returns 401 when no sandbox user or auth is provided', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, 'unauthorized');
  } finally {
    await app.close();
  }
});

test('OPTIONS preflight exposes authorization header for browser calls', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/entitlements/me',
      headers: {
        origin: 'http://127.0.0.1:3000',
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers['access-control-allow-headers'],
      'Content-Type, Authorization, x-aprovamind-user-id'
    );
  } finally {
    await app.close();
  }
});

test('GET /entitlements/me returns authenticated entitlements when no sandbox user is informed', async () => {
  class StubRealSubscriptionStateDataSource
    implements SubscriptionStateDataSource
  {
    async getUserSubscriptionState() {
      return {
        found: true as const,
        subscription: {
          userId: 'firebase-user',
          plan: PlanCode.Pro,
          status: SubscriptionStatus.Active,
        },
      };
    }
  }

  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'firebase-user', email: 'firebase-user@example.com' }
          : null,
      createRealDataSource: () => new StubRealSubscriptionStateDataSource(),
    },
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'firebase-user');
    assert.equal(body.source, 'authenticated');
    assert.equal(body.entitlements.catalogPlan, 'pro');
    assert.equal(body.entitlements.effectivePlan, 'pro');
  } finally {
    await app.close();
  }
});

test('GET /billing/subscription/me returns the manual subscription scenario when sandbox user is informed', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/billing/subscription/me?userId=premium-user',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'premium-user');
    assert.equal(body.source, 'manual');
    assert.equal(body.subscription.plan, 'premium');
    assert.equal(body.subscription.status, 'active');
  } finally {
    await app.close();
  }
});

test('GET /billing/admin/subscription blocks non-admin identities', async () => {
  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-1', email: 'user-1@example.com' }
          : null,
      isAdminIdentity: () => false,
    },
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/billing/admin/subscription?userId=tester-1',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, 'forbidden');
  } finally {
    await app.close();
  }
});

test('GET /billing/admin/subscription resolves tester by email for admin identities', async () => {
  class StubAdminDataSource implements SubscriptionAdminDataSource {
    async getUserSubscriptionState(params: { userId: string }) {
      return {
        found: true as const,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Pro,
          status: SubscriptionStatus.Active,
        },
      };
    }

    async updateUserSubscriptionState(): Promise<{
      found: true;
      subscription: {
        userId: string;
        plan: PlanCode;
        status: SubscriptionStatus;
      };
    }> {
      throw new Error('should_not_update_on_get');
    }
  }

  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'admin-1', email: 'marsleite@gmail.com' }
          : null,
      isAdminIdentity: () => true,
      findUserByEmail: async (email) =>
        email === 'tester@example.com'
          ? { uid: 'tester-1', email }
          : null,
      createAdminDataSource: () => new StubAdminDataSource(),
    },
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/billing/admin/subscription?email=tester@example.com',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'tester-1');
    assert.equal(body.email, 'tester@example.com');
    assert.equal(body.subscription.plan, 'pro');
    assert.equal(body.subscription.status, 'active');
  } finally {
    await app.close();
  }
});

test('POST /billing/admin/subscription updates a tester subscription for admin identities', async () => {
  class StubAdminDataSource implements SubscriptionAdminDataSource {
    async getUserSubscriptionState() {
      return {
        found: true as const,
        subscription: {
          userId: 'tester-1',
          plan: PlanCode.Pro,
          status: SubscriptionStatus.Active,
        },
      };
    }

    async updateUserSubscriptionState(params: {
      userId: string;
      plan?: PlanCode;
      status?: SubscriptionStatus;
      usage?: never;
      resetUsage?: boolean;
    }) {
      return {
        found: true as const,
        subscription: {
          userId: params.userId,
          plan: params.plan ?? PlanCode.Free,
          status: params.status ?? SubscriptionStatus.Active,
        },
      };
    }
  }

  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'admin-1', email: 'marsleite@gmail.com' }
          : null,
      isAdminIdentity: () => true,
      createAdminDataSource: () => new StubAdminDataSource(),
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/admin/subscription',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      payload: {
        userId: 'tester-1',
        plan: 'premium',
        status: 'past_due',
        resetUsage: true,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'tester-1');
    assert.equal(body.subscription.plan, 'premium');
    assert.equal(body.subscription.status, 'past_due');
  } finally {
    await app.close();
  }
});

test('POST /billing/admin/subscription resolves tester by email before updating', async () => {
  class StubAdminDataSource implements SubscriptionAdminDataSource {
    async getUserSubscriptionState() {
      return {
        found: true as const,
        subscription: {
          userId: 'tester-2',
          plan: PlanCode.Free,
          status: SubscriptionStatus.Active,
        },
      };
    }

    async updateUserSubscriptionState(params: {
      userId: string;
      plan?: PlanCode;
      status?: SubscriptionStatus;
      usage?: never;
      resetUsage?: boolean;
    }) {
      return {
        found: true as const,
        subscription: {
          userId: params.userId,
          plan: params.plan ?? PlanCode.Free,
          status: params.status ?? SubscriptionStatus.Active,
        },
      };
    }
  }

  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'admin-1', email: 'marsleite@gmail.com' }
          : null,
      isAdminIdentity: () => true,
      findUserByEmail: async (email) =>
        email === 'tester2@example.com'
          ? { uid: 'tester-2', email }
          : null,
      createAdminDataSource: () => new StubAdminDataSource(),
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/admin/subscription',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      payload: {
        email: 'tester2@example.com',
        plan: 'premium',
        status: 'active',
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'tester-2');
    assert.equal(body.email, 'tester2@example.com');
    assert.equal(body.subscription.plan, 'premium');
    assert.equal(body.subscription.status, 'active');
  } finally {
    await app.close();
  }
});
