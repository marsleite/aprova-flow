import type { IncomingMessage, ServerResponse } from 'node:http';

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function setCors(req: IncomingMessage, res: ServerResponse, methods: string) {
  const origin = req.headers.origin;
  res.setHeader('access-control-allow-origin', typeof origin === 'string' ? origin : '*');
  res.setHeader('access-control-allow-methods', `${methods},OPTIONS`);
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization, X-AprovaMind-User-Id');
  res.setHeader('vary', 'Origin');
}

export function extractBearerToken(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

export async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

export function readQuery(req: IncomingMessage) {
  return new URL(req.url || '/', 'http://vercel.internal').searchParams;
}

export async function verifyRequestUser(req: IncomingMessage) {
  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    return {
      ok: false as const,
      statusCode: 401,
      payload: {
        error: 'unauthorized',
        message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
      },
    };
  }

  const { verifyFirebaseIdToken } = await import('@aprovamind/infrastructure-firebase');
  const identity = await verifyFirebaseIdToken(idToken);
  if (!identity) {
    return {
      ok: false as const,
      statusCode: 401,
      payload: {
        error: 'unauthorized',
        message: 'Token expirado ou invalido.',
      },
    };
  }

  return { ok: true as const, idToken, identity };
}

export function resolveSandboxUserId(req: IncomingMessage): string | null {
  if (process.env.NODE_ENV === 'production') return null;

  const headerValue = req.headers['x-aprovamind-user-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  const queryUserId = readQuery(req).get('userId');
  return queryUserId?.trim() || null;
}

export function sendNotFound(
  res: ServerResponse,
  reason: 'user_not_found' | 'subscription_not_found'
) {
  sendJson(res, 404, {
    error: reason,
    message:
      reason === 'user_not_found'
        ? 'Usuario nao encontrado.'
        : 'Assinatura de teste nao encontrada para o usuario informado.',
  });
}
