import { describe, expect, test } from 'vitest';
import type { AiUsageEventDoc } from '@/lib/firebase/aiUsage';
import {
  buildBetaSignalsSummary,
  type ProductUsageEventDoc,
} from '@/lib/firebase/betaSignals';

describe('beta signals summary', () => {
  test('aggregates upgrade, blocking, quota, and ai usage signals for the last 7 days', () => {
    const now = new Date('2026-04-08T12:00:00.000Z');
    const productEvents: ProductUsageEventDoc[] = [
      {
        eventName: 'feature_blocked',
        userId: 'u-1',
        actorUserId: 'u-1',
        featureCode: 'weekly_mentoring',
        surface: 'mentoring_gate',
        recommendedPlan: 'pro',
        planTier: 'free',
        createdAt: '2026-04-07T10:00:00.000Z',
      },
      {
        eventName: 'upgrade_cta_viewed',
        userId: 'u-1',
        actorUserId: 'u-1',
        surface: 'mentoring_gate',
        recommendedPlan: 'pro',
        planTier: 'free',
        createdAt: '2026-04-07T10:05:00.000Z',
      },
      {
        eventName: 'upgrade_cta_clicked',
        userId: 'u-1',
        actorUserId: 'u-1',
        surface: 'mentoring_gate',
        recommendedPlan: 'pro',
        planTier: 'free',
        createdAt: '2026-04-07T10:06:00.000Z',
      },
      {
        eventName: 'ai_quota_exhausted',
        userId: 'u-2',
        actorUserId: 'u-2',
        task: 'chat',
        recommendedPlan: 'premium',
        planTier: 'pro',
        createdAt: '2026-04-06T08:00:00.000Z',
      },
      {
        eventName: 'simulation_completed',
        userId: 'u-2',
        actorUserId: 'u-2',
        surface: 'custom_simulation_completion',
        featureCode: 'simulations_custom',
        createdAt: '2026-04-06T08:05:00.000Z',
      },
      {
        eventName: 'tester_subscription_updated',
        userId: 'u-3',
        actorUserId: 'admin-1',
        createdAt: '2026-04-05T08:00:00.000Z',
      },
      {
        eventName: 'plan_status_changed',
        userId: 'u-3',
        actorUserId: 'admin-1',
        planTier: 'pro',
        metadataJson: JSON.stringify({
          previousPlan: 'free',
          nextPlan: 'pro',
          previousStatus: 'trialing',
          nextStatus: 'active',
        }),
        createdAt: '2026-04-05T08:01:00.000Z',
      },
      {
        eventName: 'upgrade_cta_viewed',
        userId: 'u-old',
        actorUserId: 'u-old',
        surface: 'old_gate',
        createdAt: '2026-03-20T08:01:00.000Z',
      },
    ];

    const aiEvents: AiUsageEventDoc[] = [
      {
        userId: 'u-1',
        route: '/ai/text',
        task: 'chat',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        latencyMs: 1200,
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
        estimatedCostUsd: 0.0123,
        success: true,
        statusCode: 200,
        createdAt: '2026-04-07T10:07:00.000Z',
      },
      {
        userId: 'u-4',
        route: '/ai/pdf',
        task: 'parse-edital',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        latencyMs: 2200,
        inputTokens: 300,
        outputTokens: 180,
        totalTokens: 480,
        estimatedCostUsd: 0.054,
        success: true,
        statusCode: 200,
        createdAt: '2026-04-03T10:07:00.000Z',
      },
      {
        userId: 'u-old',
        route: '/ai/text',
        task: 'chat',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        latencyMs: 1800,
        inputTokens: 150,
        outputTokens: 60,
        totalTokens: 210,
        estimatedCostUsd: 0.02,
        success: true,
        statusCode: 200,
        createdAt: '2026-03-20T10:07:00.000Z',
      },
    ];

    const summary = buildBetaSignalsSummary(productEvents, aiEvents, now);

    expect(summary.activeUsers).toBe(4);
    expect(summary.productEventUsers).toBe(3);
    expect(summary.aiUsers).toBe(2);
    expect(summary.featureBlocked).toBe(1);
    expect(summary.upgradeViews).toBe(1);
    expect(summary.upgradeClicks).toBe(1);
    expect(summary.upgradeCtrPercent).toBe(100);
    expect(summary.aiQuotaExhausted).toBe(1);
    expect(summary.simulationCompleted).toBe(1);
    expect(summary.testerSubscriptionUpdated).toBe(1);
    expect(summary.planStatusChanged).toBe(1);
    expect(summary.aiEvents).toBe(2);
    expect(summary.aiCostUsd).toBe(0.0663);
    expect(summary.upgradeByRecommendedPlan).toEqual([
      {
        recommendedPlan: 'pro',
        blocked: 1,
        quotaExhausted: 0,
        views: 1,
        clicks: 1,
        ctrPercent: 100,
        uniqueUsers: 1,
      },
      {
        recommendedPlan: 'premium',
        blocked: 0,
        quotaExhausted: 1,
        views: 0,
        clicks: 0,
        ctrPercent: 0,
        uniqueUsers: 1,
      },
    ]);
    expect(summary.topBlockedFeatures).toEqual([{ label: 'weekly_mentoring', count: 1 }]);
    expect(summary.topUpgradeSurfaces).toEqual([
      { label: 'mentoring_gate', views: 1, clicks: 1, ctrPercent: 100 },
    ]);
    expect(summary.topQuotaTasks).toEqual([{ task: 'chat', count: 1 }]);
    expect(summary.topPlanTransitions).toEqual([{ label: 'free -> pro', count: 1 }]);
    expect(summary.topAiTasks).toEqual([
      { task: 'parse-edital', events: 1, costUsd: 0.054 },
      { task: 'chat', events: 1, costUsd: 0.0123 },
    ]);
  });

  test('ignores malformed timestamps and falls back to safe labels', () => {
    const summary = buildBetaSignalsSummary(
      [
        {
          eventName: 'feature_blocked',
          userId: 'u-1',
          actorUserId: 'u-1',
          createdAt: 'invalid-date',
        },
        {
          eventName: 'feature_blocked',
          userId: 'u-2',
          actorUserId: 'u-2',
          createdAt: '2026-04-08T10:00:00.000Z',
        },
      ],
      [],
      new Date('2026-04-08T12:00:00.000Z')
    );

    expect(summary.featureBlocked).toBe(1);
    expect(summary.topBlockedFeatures).toEqual([{ label: 'desconhecido', count: 1 }]);
  });
});
