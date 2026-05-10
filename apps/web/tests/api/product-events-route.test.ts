import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAuthenticatedUser = vi.fn();
const saveProductUsageEvent = vi.fn();

vi.mock('@/lib/server/apiGuard', () => ({
  requireAuthenticatedUser,
}));

vi.mock('@/lib/server/productEventStore', () => ({
  saveProductUsageEvent,
}));

let POST: typeof import('@/app/api/product-events/route').POST;

beforeAll(async () => {
  ({ POST } = await import('@/app/api/product-events/route'));
});

describe('POST /api/product-events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records normalized client-side product events for authenticated users', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      key: 'user-1',
      idToken: 'token-1',
    });

    const request = new NextRequest('http://localhost/api/product-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        eventName: 'upgrade_cta_clicked',
        route: ' /planner ',
        surface: ' planner_multi_edital_gate ',
        featureCode: 'multi_edital',
        recommendedPlan: 'pro',
        metadata: {
          title: ' Multi-edital fica no Pro ',
          blockedFeatures: 'multi_edital,adaptive_daily_plan',
          ignored: '   ',
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(202);
    expect(saveProductUsageEvent).toHaveBeenCalledWith(
      {
        actorUserId: 'user-1',
        userId: 'user-1',
        eventName: 'upgrade_cta_clicked',
        route: '/planner',
        surface: 'planner_multi_edital_gate',
        featureCode: 'multi_edital',
        recommendedPlan: 'pro',
        planTier: undefined,
        ctaHref: undefined,
        metadata: {
          title: 'Multi-edital fica no Pro',
          blockedFeatures: 'multi_edital,adaptive_daily_plan',
        },
      },
      'token-1'
    );
  });

  it('accepts simulation completion as a client-side retention event', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      key: 'user-1',
      idToken: 'token-1',
    });

    const request = new NextRequest('http://localhost/api/product-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        eventName: 'simulation_completed',
        route: ' /provas/simulado-1/executar ',
        surface: ' custom_simulation_completion ',
        featureCode: 'simulations_custom',
        planTier: 'pro',
        metadata: {
          accuracyPercent: 72,
          totalQuestions: 40,
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(202);
    expect(saveProductUsageEvent).toHaveBeenCalledWith(
      {
        actorUserId: 'user-1',
        userId: 'user-1',
        eventName: 'simulation_completed',
        route: '/provas/simulado-1/executar',
        surface: 'custom_simulation_completion',
        featureCode: 'simulations_custom',
        recommendedPlan: undefined,
        planTier: 'pro',
        ctaHref: undefined,
        metadata: {
          accuracyPercent: 72,
          totalQuestions: 40,
        },
      },
      'token-1'
    );
  });

  it('rejects event names outside the client allowlist', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      key: 'user-1',
      idToken: 'token-1',
    });

    const request = new NextRequest('http://localhost/api/product-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        eventName: 'plan_status_changed',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'invalid_event_name',
      message: 'Evento de produto nao permitido nesta rota.',
    });
    expect(saveProductUsageEvent).not.toHaveBeenCalled();
  });

  it('passes through auth guard failures', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }),
    });

    const request = new NextRequest('http://localhost/api/product-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        eventName: 'feature_blocked',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(saveProductUsageEvent).not.toHaveBeenCalled();
  });
});
