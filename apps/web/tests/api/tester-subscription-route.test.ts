import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const proxyRequestToBackendApi = vi.fn();

vi.mock('@/lib/server/backendApi', () => ({
  proxyRequestToBackendApi,
}));

let GET: typeof import('@/app/api/admin/tester-subscription/route').GET;
let POST: typeof import('@/app/api/admin/tester-subscription/route').POST;

beforeAll(async () => {
  ({ GET, POST } = await import('@/app/api/admin/tester-subscription/route'));
});

describe('/api/admin/tester-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies GET requests to the dedicated billing admin route', async () => {
    proxyRequestToBackendApi.mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    );

    const request = new NextRequest(
      'http://localhost/api/admin/tester-subscription?email=tester@example.com',
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
      targetPath: '/billing/admin/subscription',
    });
    expect(response.status).toBe(200);
  });

  it('proxies POST requests to the dedicated billing admin route', async () => {
    proxyRequestToBackendApi.mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 202 })
    );

    const request = new NextRequest(
      'http://localhost/api/admin/tester-subscription',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'tester-1',
          plan: 'pro',
          status: 'active',
        }),
      }
    );

    const response = await POST(request);

    expect(proxyRequestToBackendApi).toHaveBeenCalledWith({
      request,
      targetPath: '/billing/admin/subscription',
    });
    expect(response.status).toBe(202);
  });
});
