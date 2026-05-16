import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import Fastify from 'fastify';
import { registerAiRoutes } from '../../src/modules/ai/routes';
import { firebaseAuth } from '../../src/plugins/firebase-auth';

interface FastifyInjectedResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let readyPromise: Promise<ReturnType<typeof Fastify>> | null = null;

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    normalized[key] = value;
  }

  return normalized;
}

async function readRequestBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks).toString('utf-8');
}

async function getAiApp() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const app = Fastify({ logger: true });

      app.addHook('onSend', async (request, reply, payload) => {
        const origin = request.headers.origin;
        reply.header('access-control-allow-origin', origin ?? '*');
        reply.header('access-control-allow-methods', 'POST,OPTIONS');
        reply.header('access-control-allow-headers', 'Content-Type, Authorization');
        reply.header('vary', 'Origin');
        return payload;
      });

      app.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') {
          return reply.code(204).send();
        }
      });

      app.register(firebaseAuth, {
        allowSandbox: false,
      });
      app.register(async (instance) => {
        await registerAiRoutes(instance);
      });
      await app.ready();
      return app;
    })();
  }

  return readyPromise;
}

export async function handleWithAiFastify(params: {
  req: IncomingMessage;
  res: ServerResponse;
  targetPath: '/ai/text' | '/ai/pdf';
}) {
  const app = await getAiApp();
  const requestUrl = new URL(params.req.url || '/', 'http://vercel.internal');
  const payload =
    params.req.method === 'GET' ||
    params.req.method === 'HEAD' ||
    params.req.method === 'OPTIONS'
      ? undefined
      : await readRequestBody(params.req);

  const response = await app.inject({
    method: (params.req.method || 'GET') as never,
    url: `${params.targetPath}${requestUrl.search}`,
    headers: normalizeHeaders(params.req.headers),
    payload,
  }) as FastifyInjectedResponse;

  params.res.statusCode = response.statusCode;

  for (const [key, value] of Object.entries(response.headers)) {
    if (value === undefined) continue;
    params.res.setHeader(key, value as string);
  }

  params.res.end(response.body);
}
