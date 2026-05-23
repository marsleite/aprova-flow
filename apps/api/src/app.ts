import Fastify from 'fastify';
import {
  registerEntitlementRoutes,
  type EntitlementRouteOptions,
} from './modules/entitlements/routes';
import { registerAiRoutes } from './modules/ai/routes';
import { registerEngineRoutes } from './modules/engine/routes';
import { registerBillingRoutes } from './modules/billing/routes';
import { firebaseAuth } from './plugins/firebase-auth';
import { featureGuard } from './plugins/feature-guard';

export interface CreateAppOptions {
  entitlements?: EntitlementRouteOptions;
  allowSandboxAuth?: boolean;
  allowManualScenarios?: boolean;
}

function resolveDevOnlyFlag(value: boolean | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return process.env.NODE_ENV !== 'production';
}

export function createApp(options: CreateAppOptions = {}) {
  const allowSandboxAuth = resolveDevOnlyFlag(options.allowSandboxAuth);
  const allowManualScenarios = resolveDevOnlyFlag(options.allowManualScenarios);
  const allowHeaders = allowSandboxAuth
    ? 'Content-Type, Authorization, x-aprovamind-user-id'
    : 'Content-Type, Authorization';

  const app = Fastify({
    logger: true,
  });

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const origin = request.headers.origin;
    reply.header('access-control-allow-origin', origin ?? '*');
    reply.header('access-control-allow-methods', 'GET,POST,OPTIONS');
    reply.header(
      'access-control-allow-headers',
      allowHeaders
    );
    reply.header('vary', 'Origin');
    return payload;
  });

  app.get('/', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
      message:
        allowManualScenarios
          ? 'Use /health, /entitlements/scenarios, /entitlements/me?userId=free-user, /billing/subscription/me ou /billing/admin/subscription.'
          : 'Use /health, /entitlements/me, /billing/subscription/me ou /billing/admin/subscription.',
    };
  });

  app.get('/health', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
    };
  });

  app.register(firebaseAuth, {
    allowSandbox: allowSandboxAuth,
    verifyIdToken: options.entitlements?.verifyIdToken,
  });
  app.register(featureGuard);

  void registerEntitlementRoutes(app, {
    ...options.entitlements,
    allowManualScenarios,
  });

  // AI and Engine routes depend on app.authenticate (from firebase-auth plugin).
  // Registering them as plugins ensures they run after the decorator is available.
  app.register(async (instance) => {
    await registerAiRoutes(instance);
  });
  app.register(async (instance) => {
    await registerEngineRoutes(instance);
  });
  app.register(async (instance) => {
    await registerBillingRoutes(instance);
  });

  return app;
}

const app = createApp();

export default app;
