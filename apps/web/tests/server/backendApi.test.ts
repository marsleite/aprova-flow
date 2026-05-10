import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let proxyRequestToBackendApi: typeof import('@/lib/server/backendApi').proxyRequestToBackendApi;
let resolveBackendApiBaseUrl: typeof import('@/lib/server/backendApi').resolveBackendApiBaseUrl;

const originalApiBaseUrl = process.env.API_BASE_URL;
const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

beforeAll(async () => {
  ({ proxyRequestToBackendApi, resolveBackendApiBaseUrl } = await import('@/lib/server/backendApi'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  if (originalApiBaseUrl === undefined) {
    delete process.env.API_BASE_URL;
  } else {
    process.env.API_BASE_URL = originalApiBaseUrl;
  }

  if (originalPublicApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
  }
  vi.unstubAllEnvs();
});

describe('backendApi', () => {
  it('normalizes configured API base URLs', () => {
    process.env.API_BASE_URL = 'https://api.aprovamind.test/';

    expect(resolveBackendApiBaseUrl()).toBe('https://api.aprovamind.test');
  });

  it('proxies method, headers, body and selected response headers to the dedicated API', async () => {
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv('NODE_ENV', 'test');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ found: true }), {
        status: 202,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'x-ratelimit-remaining': '4',
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest(
      'http://localhost:3000/api/engine/snapshot?planId=plan-1',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer token-1',
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          planId: 'plan-1',
          maxRecommendations: 3,
        }),
      }
    );

    const response = await proxyRequestToBackendApi({
      request,
      targetPath: '/engine/snapshot',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [targetUrl, init] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit & { headers: Headers }
    ];

    expect(String(targetUrl)).toBe(
      'http://127.0.0.1:3001/engine/snapshot?planId=plan-1'
    );
    expect(init.method).toBe('POST');
    expect(init.cache).toBe('no-store');
    expect(init.headers.get('authorization')).toBe('Bearer token-1');
    expect(init.headers.get('content-type')).toBe('application/json');
    expect(init.headers.get('accept')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({
      planId: 'plan-1',
      maxRecommendations: 3,
    }));

    expect(response.status).toBe(202);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-ratelimit-remaining')).toBe('4');
    await expect(response.json()).resolves.toEqual({ found: true });
  });

  it('returns 503 when the dedicated API base URL is missing in production', async () => {
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv('NODE_ENV', 'production');

    const request = new NextRequest('https://app.aprovamind.com/api/engine/portfolio', {
      method: 'GET',
    });

    const response = await proxyRequestToBackendApi({
      request,
      targetPath: '/engine/portfolio',
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'backend_api_unavailable',
      message: 'API dedicada não configurada para este ambiente.',
    });
  });
});
