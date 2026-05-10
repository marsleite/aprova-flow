import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let saveProductUsageEvent: typeof import('@/lib/server/productEventStore').saveProductUsageEvent;

const originalApiBaseUrl = process.env.API_BASE_URL;
const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

beforeAll(async () => {
  ({ saveProductUsageEvent } = await import('@/lib/server/productEventStore'));
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

describe('productEventStore', () => {
  it('forwards product events to the dedicated API', async () => {
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv('NODE_ENV', 'test');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await saveProductUsageEvent(
      {
        actorUserId: 'user-1',
        userId: 'user-1',
        eventName: 'ai_quota_exhausted',
        route: '/api/planner-daily',
        surface: 'ai_rate_limit',
        planTier: 'free',
        task: 'planner-daily',
        metadata: {
          limit: 8,
          window: 'day',
        },
      },
      'token-1'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/product-events',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        headers: expect.objectContaining({
          authorization: 'Bearer token-1',
          'content-type': 'application/json',
          accept: 'application/json',
        }),
      })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        actorUserId: 'user-1',
        userId: 'user-1',
        eventName: 'ai_quota_exhausted',
        route: '/api/planner-daily',
        surface: 'ai_rate_limit',
        planTier: 'free',
        task: 'planner-daily',
        metadata: {
          limit: 8,
          window: 'day',
        },
      })
    );
  });

  it('swallows dedicated API failures to keep instrumentation best-effort', async () => {
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv('NODE_ENV', 'test');

    const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(
      saveProductUsageEvent(
        {
          actorUserId: 'user-1',
          userId: 'user-1',
          eventName: 'feature_blocked',
        },
        'token-1'
      )
    ).resolves.toBeUndefined();

    expect(warnMock).toHaveBeenCalledWith(
      '[product-events] dedicated API request failed:',
      'network down'
    );
  });
});
