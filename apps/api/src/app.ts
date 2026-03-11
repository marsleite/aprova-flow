import Fastify from 'fastify';

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.get('/health', async () => {
    return {
      service: 'aprovamind-api',
      status: 'ok',
    };
  });

  return app;
}
