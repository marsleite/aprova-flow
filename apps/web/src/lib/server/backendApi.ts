import { NextRequest, NextResponse } from 'next/server';

function normalizeConfiguredBaseUrl(value: string | undefined): string {
  return (value || '').trim().replace(/\/$/, '');
}

export function resolveBackendApiBaseUrl(): string {
  const configured =
    normalizeConfiguredBaseUrl(process.env.API_BASE_URL) ||
    normalizeConfiguredBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:3001';
  }

  return '';
}

export async function proxyRequestToBackendApi(params: {
  request: NextRequest;
  targetPath: string;
}): Promise<NextResponse> {
  const baseUrl = resolveBackendApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: 'backend_api_unavailable',
        message: 'API dedicada não configurada para este ambiente.',
      },
      { status: 503 }
    );
  }

  const incomingUrl = new URL(params.request.url);
  const targetUrl = new URL(`${baseUrl}${params.targetPath}`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers();
  const authorization = params.request.headers.get('authorization');
  const contentType = params.request.headers.get('content-type');
  const accept = params.request.headers.get('accept');

  if (authorization) headers.set('authorization', authorization);
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);

  const hasBody =
    params.request.method !== 'GET' &&
    params.request.method !== 'HEAD' &&
    params.request.method !== 'OPTIONS';
  const body = hasBody ? await params.request.text() : undefined;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: params.request.method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[backendApi] dedicated API request failed', {
      targetPath: params.targetPath,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'backend_api_fetch_failed',
        message: 'API dedicada indisponível no momento.',
      },
      { status: 502 }
    );
  }

  const payload = await response.text();
  const responseHeaders = new Headers();
  const passthroughHeaders = [
    'content-type',
    'cache-control',
    'x-ai-plan-tier',
    'x-ratelimit-resource',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'x-ratelimit-window',
    'x-ai-provider',
    'x-ai-model',
    'x-ai-latency-ms',
    'x-ai-cost-usd',
    'retry-after',
  ];

  for (const key of passthroughHeaders) {
    const value = response.headers.get(key);
    if (value) {
      responseHeaders.set(key, value);
    }
  }

  return new NextResponse(payload, {
    status: response.status,
    headers: responseHeaders,
  });
}
