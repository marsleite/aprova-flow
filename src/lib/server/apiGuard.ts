import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from './firebaseAdmin';

type LimiterState = {
  count: number;
  resetAt: number;
};

const inMemoryLimiter = new Map<string, LimiterState>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function requireAuthenticatedUser(req: NextRequest): Promise<
  | { uid: string; key: string }
  | { response: NextResponse }
> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return { response: NextResponse.json({ error: 'Token inválido.' }, { status: 401 }) };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, key: decoded.uid };
  } catch {
    const ip = getClientIp(req);
    return {
      response: NextResponse.json(
        { error: 'Sessão inválida. Faça login novamente.' },
        { status: 401, headers: { 'x-client-ip': ip } }
      ),
    };
  }
}

export function enforceRateLimit(opts: {
  key: string;
  bucket: string;
  max: number;
  windowMs: number;
}): NextResponse | null {
  const now = Date.now();
  const compositeKey = `${opts.bucket}:${opts.key}`;
  const state = inMemoryLimiter.get(compositeKey);

  if (!state || state.resetAt <= now) {
    inMemoryLimiter.set(compositeKey, {
      count: 1,
      resetAt: now + opts.windowMs,
    });
    return null;
  }

  if (state.count >= opts.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em instantes.' },
      { status: 429, headers: { 'retry-after': String(retryAfterSeconds) } }
    );
  }

  state.count += 1;
  inMemoryLimiter.set(compositeKey, state);
  return null;
}
