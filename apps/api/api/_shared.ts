import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/app';

interface FastifyInjectedResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let readyPromise: Promise<void> | null = null;

async function ensureAppReady() {
  if (!readyPromise) {
    readyPromise = Promise.resolve(app.ready()).then(() => undefined);
  }

  await readyPromise;
}

async function readRequestBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    normalized[key] = value;
  }

  return normalized;
}

export async function handleWithFastify(params: {
  req: IncomingMessage;
  res: ServerResponse;
  targetPath: string;
}) {
  await ensureAppReady();

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
