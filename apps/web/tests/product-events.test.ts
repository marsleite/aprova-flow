import { describe, expect, it } from 'vitest';
import {
  buildAiQuotaExhaustedEvent,
  buildPlanStatusChangedEvent,
  buildProductEventDocument,
  buildTesterSubscriptionUpdatedEvent,
  serializeProductEventMetadata,
} from '@/lib/product-events/types';

describe('product events', () => {
  it('serializes only supported metadata values', () => {
    expect(
      serializeProductEventMetadata({
        title: ' Motor do Dia ',
        limit: 3,
        retryAfterSeconds: null,
        viewed: true,
        empty: '   ',
        invalid: Number.NaN,
      })
    ).toBe(
      JSON.stringify({
        title: 'Motor do Dia',
        limit: 3,
        retryAfterSeconds: null,
        viewed: true,
      })
    );
  });

  it('builds product event documents with actor fallback', () => {
    expect(
      buildProductEventDocument(
        {
          actorUserId: 'user-1',
          eventName: 'upgrade_cta_clicked',
          route: ' /planner ',
          recommendedPlan: 'premium',
          metadata: {
            title: 'Multi-edital',
          },
        },
        '2026-04-08T12:00:00.000Z'
      )
    ).toEqual({
      actorUserId: 'user-1',
      userId: 'user-1',
      eventName: 'upgrade_cta_clicked',
      route: '/planner',
      surface: undefined,
      featureCode: undefined,
      recommendedPlan: 'premium',
      planTier: undefined,
      task: undefined,
      status: undefined,
      ctaHref: undefined,
      targetUserId: undefined,
      targetEmail: undefined,
      metadataJson: JSON.stringify({ title: 'Multi-edital' }),
      createdAt: '2026-04-08T12:00:00.000Z',
    });
  });

  it('creates ai quota exhausted events with retry context', () => {
    expect(
      buildAiQuotaExhaustedEvent({
        uid: 'user-2',
        task: 'chat',
        planTier: 'free',
        limit: 5,
        window: 'month',
        route: '/api/chat',
        retryAfterSeconds: 3600,
      })
    ).toEqual({
      actorUserId: 'user-2',
      userId: 'user-2',
      eventName: 'ai_quota_exhausted',
      route: '/api/chat',
      surface: 'ai_rate_limit',
      featureCode: undefined,
      recommendedPlan: 'pro',
      planTier: 'free',
      task: 'chat',
      metadata: {
        limit: 5,
        window: 'month',
        retryAfterSeconds: 3600,
      },
    });
  });

  it('creates tester subscription events with usage context', () => {
    expect(
      buildTesterSubscriptionUpdatedEvent({
        actorUserId: 'admin-1',
        targetUserId: 'tester-1',
        targetEmail: 'tester@example.com',
        nextPlan: 'pro',
        nextStatus: 'active',
        previousPlan: 'free',
        previousStatus: 'trialing',
        resetUsage: false,
        usageKeys: ['contextual_ai_chat', 'weekly_mentoring'],
      })
    ).toEqual({
      actorUserId: 'admin-1',
      userId: 'tester-1',
      eventName: 'tester_subscription_updated',
      surface: 'tester_subscription_admin',
      planTier: 'pro',
      status: 'active',
      targetUserId: 'tester-1',
      targetEmail: 'tester@example.com',
      metadata: {
        previousPlan: 'free',
        previousStatus: 'trialing',
        resetUsage: false,
        usageKeys: 'contextual_ai_chat,weekly_mentoring',
      },
    });
  });

  it('creates explicit status-change events', () => {
    expect(
      buildPlanStatusChangedEvent({
        actorUserId: 'admin-1',
        targetUserId: 'tester-1',
        targetEmail: 'tester@example.com',
        previousPlan: 'free',
        nextPlan: 'premium',
        previousStatus: 'active',
        nextStatus: 'grace_period',
      })
    ).toEqual({
      actorUserId: 'admin-1',
      userId: 'tester-1',
      eventName: 'plan_status_changed',
      surface: 'tester_subscription_admin',
      planTier: 'premium',
      status: 'grace_period',
      targetUserId: 'tester-1',
      targetEmail: 'tester@example.com',
      metadata: {
        previousPlan: 'free',
        nextPlan: 'premium',
        previousStatus: 'active',
        nextStatus: 'grace_period',
      },
    });
  });
});
