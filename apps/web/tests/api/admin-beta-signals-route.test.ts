import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const proxyRequestToBackendApi = vi.fn();

vi.mock('@/lib/server/backendApi', () => ({
  proxyRequestToBackendApi,
}));

let GET: typeof import('@/app/api/admin/beta-signals/route').GET;

beforeAll(async () => {
  ({ GET } = await import('@/app/api/admin/beta-signals/route'));
});

describe('/api/admin/beta-signals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies GET requests to the dedicated beta signals admin route', async () => {
    proxyRequestToBackendApi.mockResolvedValue(
      NextResponse.json({ activeUsers: 4 }, { status: 200 })
    );

    const request = new NextRequest(
      'http://localhost/api/admin/beta-signals?windowDays=14',
      {
        method: 'GET',
        headers: {
          authorization: 'Bearer admin-token',
        },
      }
    );

    const response = await GET(request);

    expect(proxyRequestToBackendApi).toHaveBeenCalledWith({
      request,
      targetPath: '/billing/admin/beta-signals',
    });
    expect(response.status).toBe(200);
  });
});
