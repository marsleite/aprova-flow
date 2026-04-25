import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './app';
import type { ProductEventInput } from '@aprovamind/contracts/analytics/ProductEvents';
import type {
  LoadAllPlanEngineContextsResult,
  LoadPlanEngineContextResult,
} from '@aprovamind/application/ports/EngineDataSource';
import type { SubscriptionStateDataSource } from '@aprovamind/application/ports/SubscriptionStateDataSource';
import { PlanCode, SubscriptionStatus } from '@aprovamind/domain';
import type {
  PlanEngineContext,
  PlanInput,
  QuestionSessionInput,
  StudySessionInput,
  SubjectPlanInput,
} from '@aprovamind/domain/types';
import { LegacyEngineDataSource } from '@aprovamind/infrastructure-firebase/LegacyEngineDataSource';
import type { SubscriptionAdminDataSource } from './modules/entitlements/firestore-subscription-admin-data-source';

type LoadPlanEngineContextMethod = LegacyEngineDataSource['loadPlanEngineContext'];
type LoadAllPlanEngineContextsMethod = LegacyEngineDataSource['loadAllPlanEngineContexts'];

function buildSubjectPlan(
  overrides: Partial<SubjectPlanInput> = {}
): SubjectPlanInput {
  return {
    subject: 'Direito Constitucional',
    weight: 100,
    priorityOverride: null,
    ...overrides,
  };
}

function buildPlanInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    planId: 'plan-1',
    name: 'PGE-SP 2026',
    subjects: [buildSubjectPlan()],
    weeklyGoalHours: 4,
    examDate: null,
    color: '#0f766e',
    userPriority: 3,
    ...overrides,
  };
}

function buildStudySession(
  overrides: Partial<StudySessionInput> & { hours?: number } = {}
): StudySessionInput {
  const { hours = 2, ...rest } = overrides;

  return {
    subject: 'Direito Constitucional',
    durationSeconds: Math.round(hours * 3600),
    date: '2026-04-08',
    source: 'timer',
    ...rest,
  };
}

function buildQuestionSession(
  overrides: Partial<QuestionSessionInput> = {}
): QuestionSessionInput {
  return {
    subject: 'Direito Constitucional',
    totalQuestions: 20,
    correctAnswers: 14,
    date: '2026-04-08',
    ...overrides,
  };
}

function buildPlanEngineContext(
  overrides: Partial<PlanEngineContext> = {}
): PlanEngineContext {
  const sessions = overrides.sessions ?? [buildStudySession()];
  const questions = overrides.questions ?? [buildQuestionSession()];

  return {
    plan: overrides.plan ?? buildPlanInput(),
    sessions,
    questions,
    allTimeSessions: overrides.allTimeSessions ?? sessions,
    allTimeQuestions: overrides.allTimeQuestions ?? questions,
    today: overrides.today ?? '2026-04-08',
  };
}

function createAuthenticatedApp() {
  return createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'firebase-user', email: 'firebase-user@example.com' }
          : null,
    },
  });
}

async function withStubbedLegacyEngineDataSource<T>(
  handlers: {
    loadPlanEngineContext?: LoadPlanEngineContextMethod;
    loadAllPlanEngineContexts?: LoadAllPlanEngineContextsMethod;
  },
  run: () => Promise<T>
): Promise<T> {
  const originalLoadPlanEngineContext =
    LegacyEngineDataSource.prototype.loadPlanEngineContext;
  const originalLoadAllPlanEngineContexts =
    LegacyEngineDataSource.prototype.loadAllPlanEngineContexts;

  LegacyEngineDataSource.prototype.loadPlanEngineContext =
    (handlers.loadPlanEngineContext ??
      (async () => {
        throw new Error('Unexpected loadPlanEngineContext call in test.');
      })) as LoadPlanEngineContextMethod;

  LegacyEngineDataSource.prototype.loadAllPlanEngineContexts =
    (handlers.loadAllPlanEngineContexts ??
      (async () => {
        throw new Error('Unexpected loadAllPlanEngineContexts call in test.');
      })) as LoadAllPlanEngineContextsMethod;

  try {
    return await run();
  } finally {
    LegacyEngineDataSource.prototype.loadPlanEngineContext =
      originalLoadPlanEngineContext;
    LegacyEngineDataSource.prototype.loadAllPlanEngineContexts =
      originalLoadAllPlanEngineContexts;
  }
}

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

test('OPTIONS preflight hides sandbox auth header when sandbox auth is disabled', async () => {
  const app = createApp({
    allowSandboxAuth: false,
  });

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
      'Content-Type, Authorization'
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

test('GET /entitlements/scenarios is not exposed when manual scenarios are disabled', async () => {
  const app = createApp({
    allowManualScenarios: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/scenarios',
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});

test('GET /entitlements/me ignores sandbox query when manual scenarios are disabled', async () => {
  const app = createApp({
    allowManualScenarios: false,
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me?userId=pro-user',
      headers: {
        'x-aprovamind-user-id': 'pro-user',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, 'unauthorized');
  } finally {
    await app.close();
  }
});

test('GET /billing/subscription/me ignores sandbox query when manual scenarios are disabled', async () => {
  const app = createApp({
    allowManualScenarios: false,
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/billing/subscription/me?userId=premium-user',
      headers: {
        'x-aprovamind-user-id': 'premium-user',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, 'unauthorized');
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

  const recordedEvents: Array<{
    event: ProductEventInput;
    idToken: string;
  }> = [];

  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'admin-1', email: 'marsleite@gmail.com' }
          : null,
      isAdminIdentity: () => true,
      createAdminDataSource: () => new StubAdminDataSource(),
      saveProductUsageEvent: async (event, idToken) => {
        recordedEvents.push({ event, idToken });
      },
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
    assert.equal(recordedEvents.length, 2);
    assert.deepEqual(
      recordedEvents.map(({ event }) => event.eventName).sort(),
      ['plan_status_changed', 'tester_subscription_updated']
    );
    assert.equal(recordedEvents[0]?.idToken, 'valid-token');
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
      saveProductUsageEvent: async () => {},
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

test('POST /product-events records public product events for authenticated users', async () => {
  const recordedEvents: Array<{
    event: ProductEventInput;
    idToken: string;
  }> = [];

  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-1', email: 'user@example.com' }
          : null,
      saveProductUsageEvent: async (event, idToken) => {
        recordedEvents.push({ event, idToken });
      },
    },
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/product-events',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      payload: {
        eventName: 'upgrade_cta_clicked',
        route: ' /planner ',
        surface: ' planner_multi_edital_gate ',
        featureCode: 'multi_edital',
        recommendedPlan: 'premium',
        metadata: {
          title: ' Multi-edital fica no Premium ',
          ignored: '   ',
        },
      },
    });

    assert.equal(response.statusCode, 202);
    assert.equal(recordedEvents.length, 1);
    assert.deepEqual(recordedEvents[0], {
      event: {
        actorUserId: 'user-1',
        userId: 'user-1',
        eventName: 'upgrade_cta_clicked',
        route: '/planner',
        surface: 'planner_multi_edital_gate',
        featureCode: 'multi_edital',
        recommendedPlan: 'premium',
        planTier: undefined,
        task: undefined,
        ctaHref: undefined,
        metadata: {
          title: 'Multi-edital fica no Premium',
        },
      },
      idToken: 'valid-token',
    });
  } finally {
    await app.close();
  }
});

test('POST /product-events records simulation completion events for authenticated users', async () => {
  const savedEvents: ProductEventInput[] = [];
  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-1', email: 'user@example.com' }
          : null,
      saveProductUsageEvent: async (event) => {
        savedEvents.push(event);
      },
    },
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/product-events',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      payload: {
        eventName: 'simulation_completed',
        surface: 'custom_simulation_completion',
        featureCode: 'simulations_custom',
        planTier: 'pro',
        metadata: {
          accuracyPercent: 80,
          totalQuestions: 30,
        },
      },
    });

    assert.equal(response.statusCode, 202);
    assert.deepEqual(savedEvents, [
      {
        actorUserId: 'user-1',
        userId: 'user-1',
        eventName: 'simulation_completed',
        route: undefined,
        surface: 'custom_simulation_completion',
        featureCode: 'simulations_custom',
        recommendedPlan: undefined,
        planTier: 'pro',
        task: undefined,
        ctaHref: undefined,
        metadata: {
          accuracyPercent: 80,
          totalQuestions: 30,
        },
      },
    ]);
  } finally {
    await app.close();
  }
});

test('POST /product-events rejects product events outside the public allowlist', async () => {
  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-1', email: 'user@example.com' }
          : null,
      saveProductUsageEvent: async () => {
        throw new Error('should not be called');
      },
    },
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/product-events',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      payload: {
        eventName: 'plan_status_changed',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), {
      error: 'invalid_event_name',
      message: 'Evento de produto nao permitido nesta rota.',
    });
  } finally {
    await app.close();
  }
});

test('GET /billing/admin/beta-signals returns the aggregated admin summary', async () => {
  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'admin-1', email: 'marsleite@gmail.com' }
          : null,
      isAdminIdentity: () => true,
      loadAdminBetaSignalsSummary: async ({ idToken, windowDays }) => {
        assert.equal(idToken, 'valid-token');
        assert.equal(windowDays, 14);

        return {
          windowDays,
          activeUsers: 4,
          productEventUsers: 3,
          aiUsers: 2,
          featureBlocked: 6,
          upgradeViews: 8,
          upgradeClicks: 3,
          upgradeCtrPercent: 38,
          aiQuotaExhausted: 2,
          simulationCompleted: 4,
          testerSubscriptionUpdated: 1,
          planStatusChanged: 1,
          aiEvents: 11,
          aiCostUsd: 0.1842,
          upgradeByRecommendedPlan: [
            {
              recommendedPlan: 'pro',
              blocked: 5,
              quotaExhausted: 1,
              views: 6,
              clicks: 2,
              ctrPercent: 33,
              uniqueUsers: 3,
            },
          ],
          topBlockedFeatures: [{ label: 'weekly_mentoring', count: 3 }],
          topUpgradeSurfaces: [{ label: 'mentoring_gate', views: 4, clicks: 2, ctrPercent: 50 }],
          topQuotaTasks: [{ task: 'chat', count: 2 }],
          topPlanTransitions: [{ label: 'free -> pro', count: 1 }],
          topAiTasks: [{ task: 'chat', events: 5, costUsd: 0.074 }],
        };
      },
    },
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/billing/admin/beta-signals?windowDays=14',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      windowDays: 14,
      activeUsers: 4,
      productEventUsers: 3,
      aiUsers: 2,
      featureBlocked: 6,
      upgradeViews: 8,
      upgradeClicks: 3,
      upgradeCtrPercent: 38,
      aiQuotaExhausted: 2,
      simulationCompleted: 4,
      testerSubscriptionUpdated: 1,
      planStatusChanged: 1,
      aiEvents: 11,
      aiCostUsd: 0.1842,
      upgradeByRecommendedPlan: [
        {
          recommendedPlan: 'pro',
          blocked: 5,
          quotaExhausted: 1,
          views: 6,
          clicks: 2,
          ctrPercent: 33,
          uniqueUsers: 3,
        },
      ],
      topBlockedFeatures: [{ label: 'weekly_mentoring', count: 3 }],
      topUpgradeSurfaces: [{ label: 'mentoring_gate', views: 4, clicks: 2, ctrPercent: 50 }],
      topQuotaTasks: [{ task: 'chat', count: 2 }],
      topPlanTransitions: [{ label: 'free -> pro', count: 1 }],
      topAiTasks: [{ task: 'chat', events: 5, costUsd: 0.074 }],
    });
  } finally {
    await app.close();
  }
});

test('GET /billing/admin/beta-signals blocks non-admin identities', async () => {
  const app = createApp({
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-1', email: 'user@example.com' }
          : null,
      isAdminIdentity: () => false,
      loadAdminBetaSignalsSummary: async () => {
        throw new Error('should not be called');
      },
    },
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/billing/admin/beta-signals',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), {
      error: 'forbidden',
      message: 'Somente administradores podem revisar sinais do beta.',
    });
  } finally {
    await app.close();
  }
});

test(
  'POST /engine/snapshot returns the application snapshot for authenticated users',
  { concurrency: false },
  async () => {
    const context = buildPlanEngineContext();

    await withStubbedLegacyEngineDataSource(
      {
        loadPlanEngineContext: async (): Promise<LoadPlanEngineContextResult> => ({
          found: true,
          context,
        }),
      },
      async () => {
        const app = createAuthenticatedApp();

        try {
          const response = await app.inject({
            method: 'POST',
            url: '/engine/snapshot',
            headers: {
              authorization: 'Bearer valid-token',
              'content-type': 'application/json',
            },
            payload: {
              planId: 'plan-1',
              maxRecommendations: 2,
            },
          });

          assert.equal(response.statusCode, 200);
          assert.equal(response.headers['cache-control'], 'no-store');

          const body = response.json();
          assert.equal(body.found, true);
          assert.equal(body.snapshot.plan.planId, 'plan-1');
          assert.equal(body.snapshot.plan.name, 'PGE-SP 2026');
          assert.ok(Array.isArray(body.snapshot.subjects));
          assert.ok(body.snapshot.subjects.length >= 1);
          assert.ok(Array.isArray(body.snapshot.recommendations));
          assert.ok(body.snapshot.recommendations.length >= 1);
        } finally {
          await app.close();
        }
      }
    );
  }
);

test(
  'GET /engine/portfolio returns the multi-plan portfolio for authenticated users',
  { concurrency: false },
  async () => {
    const constitutionalPlan = buildPlanEngineContext({
      plan: buildPlanInput({
        planId: 'plan-constitutional',
        name: 'TRF 2026',
        color: '#2563eb',
        subjects: [buildSubjectPlan({ subject: 'Direito Constitucional' })],
      }),
    });
    const administrativePlan = buildPlanEngineContext({
      plan: buildPlanInput({
        planId: 'plan-administrative',
        name: 'MP 2026',
        color: '#dc2626',
        userPriority: 2,
        subjects: [buildSubjectPlan({ subject: 'Direito Administrativo' })],
      }),
      sessions: [
        buildStudySession({
          subject: 'Direito Administrativo',
          hours: 1,
          date: '2026-04-07',
        }),
      ],
      questions: [
        buildQuestionSession({
          subject: 'Direito Administrativo',
          totalQuestions: 18,
          correctAnswers: 11,
          date: '2026-04-07',
        }),
      ],
    });

    await withStubbedLegacyEngineDataSource(
      {
        loadAllPlanEngineContexts:
          async (): Promise<LoadAllPlanEngineContextsResult> => ({
            found: true,
            contexts: [constitutionalPlan, administrativePlan],
          }),
      },
      async () => {
        const app = createAuthenticatedApp();

        try {
          const response = await app.inject({
            method: 'GET',
            url: '/engine/portfolio?globalWeeklyBudget=24',
            headers: {
              authorization: 'Bearer valid-token',
            },
          });

          assert.equal(response.statusCode, 200);
          assert.equal(response.headers['cache-control'], 'no-store');

          const body = response.json();
          assert.equal(body.found, true);
          assert.equal(body.snapshot.globalWeeklyBudget, 24);
          assert.equal(body.snapshot.userId, 'firebase-user');
          assert.equal(body.snapshot.plans.length, 2);
          assert.ok(
            body.snapshot.plans.some((plan: { planId: string }) => plan.planId === 'plan-constitutional')
          );
          assert.ok(
            body.snapshot.plans.some((plan: { planId: string }) => plan.planId === 'plan-administrative')
          );
        } finally {
          await app.close();
        }
      }
    );
  }
);
