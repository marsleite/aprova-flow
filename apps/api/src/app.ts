import Fastify from 'fastify';
import {
  registerEntitlementRoutes,
  type EntitlementRouteOptions,
} from './modules/entitlements/routes';
import { registerAiRoutes } from './modules/ai/routes';
import { registerEngineRoutes } from './modules/engine/routes';
import { firebaseAuth } from './plugins/firebase-auth';
import { featureGuard } from './plugins/feature-guard';

export interface CreateAppOptions {
  entitlements?: EntitlementRouteOptions;
}

export function createApp(options: CreateAppOptions = {}) {
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
      'Content-Type, Authorization, x-aprovamind-user-id'
    );
    reply.header('vary', 'Origin');
    return payload;
  });

  app.get('/', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
      message:
        'Use /health, /entitlements/me?userId=free-user, /billing/subscription/me ou /billing/admin/subscription.',
    };
  });

  app.get('/health', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
    };
  });

  app.register(firebaseAuth, { allowSandbox: true });
  app.register(featureGuard);

  void registerEntitlementRoutes(app, options.entitlements);

  // AI and Engine routes depend on app.authenticate (from firebase-auth plugin).
  // Registering them as plugins ensures they run after the decorator is available.
  app.register(async (instance) => {
    await registerAiRoutes(instance);
  });
  app.register(async (instance) => {
    await registerEngineRoutes(instance);
  });

  return app;
}

const app = createApp();

export default app;
