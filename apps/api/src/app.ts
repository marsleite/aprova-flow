import Fastify from 'fastify';
import { registerEntitlementRoutes } from './modules/entitlements/routes';

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const origin = request.headers.origin;
    reply.header('access-control-allow-origin', origin ?? '*');
    reply.header('access-control-allow-methods', 'GET,OPTIONS');
    reply.header(
      'access-control-allow-headers',
      'Content-Type, x-aprovamind-user-id'
    );
    reply.header('vary', 'Origin');
    return payload;
  });

  app.get('/', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
      message: 'Use /health ou /entitlements/me?userId=free-user para testar.',
    };
  });

  app.get('/health', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
    };
  });

  void registerEntitlementRoutes(app);

  return app;
}

const app = createApp();

export default app;
