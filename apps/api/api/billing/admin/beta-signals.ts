import type { IncomingMessage, ServerResponse } from 'node:http';

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function setCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  res.setHeader('access-control-allow-origin', typeof origin === 'string' ? origin : '*');
  res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization');
  res.setHeader('vary', 'Origin');
}

function extractBearerToken(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

function readWindowDays(req: IncomingMessage): number {
  const requestUrl = new URL(req.url || '/', 'http://vercel.internal');
  const parsed = Number(requestUrl.searchParams.get('windowDays'));
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.min(30, Math.floor(parsed));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, {
      error: 'method_not_allowed',
      message: 'Use GET para carregar os sinais do beta.',
    });
    return;
  }

  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    sendJson(res, 401, {
      error: 'unauthorized',
      message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
    });
    return;
  }

  try {
    const [
      { verifyFirebaseIdToken },
      { defaultIsAdminIdentity },
      { loadAdminBetaSignalsSummary },
    ] = await Promise.all([
      import('@aprovamind/infrastructure-firebase'),
      import('../../../src/modules/entitlements/subscription-state.shared'),
      import('../../../src/modules/entitlements/beta-signals'),
    ]);

    const identity = await verifyFirebaseIdToken(idToken);
    if (!identity) {
      sendJson(res, 401, {
        error: 'unauthorized',
        message: 'Token expirado ou invalido.',
      });
      return;
    }

    if (!defaultIsAdminIdentity(identity)) {
      sendJson(res, 403, {
        error: 'forbidden',
        message: 'Somente administradores podem revisar sinais do beta.',
      });
      return;
    }

    const summary = await loadAdminBetaSignalsSummary({
      idToken,
      windowDays: readWindowDays(req),
    });

    sendJson(res, 200, summary);
  } catch (error) {
    console.error('[api-beta-signals] execution failed', error);
    sendJson(res, 500, {
      error: 'beta_signals_fetch_failed',
      message: 'Nao foi possivel carregar os sinais do beta.',
    });
  }
}
