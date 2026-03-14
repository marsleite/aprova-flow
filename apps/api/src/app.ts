import Fastify from 'fastify';
import {
  registerEntitlementRoutes,
  type EntitlementRouteOptions,
} from './modules/entitlements/routes';

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

  void registerEntitlementRoutes(app, options.entitlements);

  return app;
}

const app = createApp();

export default app;
