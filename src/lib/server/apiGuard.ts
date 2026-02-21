import { NextRequest, NextResponse } from 'next/server';

type LimiterState = {
  count: number;
  resetAt: number;
};

const inMemoryLimiter = new Map<string, LimiterState>();

type IdentityToolkitLookupResponse = {
  users?: Array<{
    localId?: string;
  }>;
};

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as IdentityToolkitLookupResponse;
  const uid = data.users?.[0]?.localId;
  return uid || null;
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
    const uid = await verifyFirebaseIdToken(idToken);
    if (!uid) {
      return {
        response: NextResponse.json(
          { error: 'Sessão inválida ou expirada. Faça login novamente.' },
          { status: 401 }
        ),
      };
    }

    return { uid, key: uid };
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
