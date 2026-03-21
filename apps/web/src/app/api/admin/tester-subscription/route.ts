import { NextRequest, NextResponse } from 'next/server';
import { resolveEntitlementsApiBaseUrl } from '@/lib/entitlements-client';

function buildUpstreamUrl(request: NextRequest): string | null {
  const baseUrl = resolveEntitlementsApiBaseUrl();
  if (!baseUrl) return null;

  const upstream = new URL(`${baseUrl}/billing/admin/subscription`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  return upstream.toString();
}

function buildForwardHeaders(request: NextRequest, includeJson: boolean) {
  const headers = new Headers();
  headers.set('Accept', 'application/json');

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
  }

  if (includeJson) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function forwardResponse(upstreamResponse: Response) {
  const body = await upstreamResponse.text();

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      'content-type':
        upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8',
    },
  });
}

export async function GET(request: NextRequest) {
  const upstreamUrl = buildUpstreamUrl(request);

  if (!upstreamUrl) {
    return NextResponse.json(
      {
        error: 'missing_api_base_url',
        message: 'A API de billing nao esta configurada neste ambiente.',
      },
      { status: 500 }
    );
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: buildForwardHeaders(request, false),
      cache: 'no-store',
    });

    return forwardResponse(upstreamResponse);
  } catch {
    return NextResponse.json(
      {
        error: 'billing_admin_unavailable',
        message: 'Nao foi possivel conectar a API admin local.',
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const upstreamUrl = buildUpstreamUrl(request);

  if (!upstreamUrl) {
    return NextResponse.json(
      {
        error: 'missing_api_base_url',
        message: 'A API de billing nao esta configurada neste ambiente.',
      },
      { status: 500 }
    );
  }

  const body = await request.text();

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: buildForwardHeaders(request, true),
      body,
      cache: 'no-store',
    });

    return forwardResponse(upstreamResponse);
  } catch {
    return NextResponse.json(
      {
        error: 'billing_admin_unavailable',
        message: 'Nao foi possivel conectar a API admin local.',
      },
      { status: 503 }
    );
  }
}
