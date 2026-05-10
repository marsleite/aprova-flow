import { describe, expect, it } from 'vitest';
import {
  AccessState,
  DEFAULT_ENTITLEMENT_POLICY,
  FeatureCode,
  PlanCode,
  SubscriptionStatus,
  resolveUserEntitlements,
} from '@aprovamind/domain';
import {
  buildFeatureUsagePeriods,
  materializeCurrentFeatureUsage,
} from '@aprovamind/domain/billing/usage-periods';

describe('Billing entitlements', () => {
  it('keeps free focused on activation and blocks paid features', () => {
    const entitlements = resolveUserEntitlements({
      plan: PlanCode.Free,
      status: SubscriptionStatus.Active,
    });

    expect(entitlements.effectivePlan).toBe(PlanCode.Free);
    expect(entitlements.accessState).toBe(AccessState.Full);
    expect(entitlements.features[FeatureCode.StudyTimer]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.SimulationsBasic]).toMatchObject({
      mode: 'quota',
      limit: 2,
      remaining: 2,
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.SimulationsCustom]).toEqual({
      mode: 'boolean',
      enabled: false,
    });
    expect(entitlements.features[FeatureCode.ErrorGapAnalyzer]).toEqual({
      mode: 'boolean',
      enabled: false,
    });
    expect(entitlements.features[FeatureCode.MultiEdital]).toEqual({
      mode: 'boolean',
      enabled: false,
    });
    expect(entitlements.features[FeatureCode.AiExplanations]).toMatchObject({
      mode: 'quota',
      limit: 3,
      remaining: 3,
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.EditalParse]).toMatchObject({
      mode: 'quota',
      limit: 1,
      remaining: 1,
      period: 'lifetime',
      enabled: true,
    });
  });

  it('unlocks the full single-plan engine for pro', () => {
    const entitlements = resolveUserEntitlements({
      plan: PlanCode.Pro,
      status: SubscriptionStatus.Active,
    });

    expect(entitlements.effectivePlan).toBe(PlanCode.Pro);
    expect(entitlements.features[FeatureCode.SubjectHealthFull]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.PriorityScoreFull]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.SimulationsCustom]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.SimulationsAnalytics]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.ErrorGapAnalyzer]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.MultiEdital]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
  });

  it('falls back to free when the subscription expires', () => {
    const entitlements = resolveUserEntitlements({
      plan: PlanCode.Pro,
      status: SubscriptionStatus.Expired,
    });

    expect(entitlements.catalogPlan).toBe(PlanCode.Pro);
    expect(entitlements.effectivePlan).toBe(PlanCode.Free);
    expect(entitlements.accessState).toBe(AccessState.FreeFallback);
    expect(entitlements.features[FeatureCode.MultiEdital]).toEqual({
      mode: 'boolean',
      enabled: false,
    });
    expect(entitlements.features[FeatureCode.AiExplanations]).toMatchObject({
      mode: 'quota',
      limit: 3,
      remaining: 3,
      enabled: true,
    });
  });

  it('restricts costly features when the subscription is past due', () => {
    const entitlements = resolveUserEntitlements({
      plan: PlanCode.Pro,
      status: SubscriptionStatus.PastDue,
    });

    expect(entitlements.accessState).toBe(AccessState.Restricted);
    expect(entitlements.features[FeatureCode.SubjectHealthFull]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(entitlements.features[FeatureCode.AiExplanations]).toMatchObject({
      mode: 'quota',
      limit: 0,
      remaining: 0,
      enabled: false,
    });
    expect(entitlements.features[FeatureCode.EditalParse]).toMatchObject({
      mode: 'quota',
      limit: 0,
      remaining: 0,
      enabled: false,
    });
    expect(entitlements.features[FeatureCode.AdaptiveDailyPlan]).toEqual({
      mode: 'boolean',
      enabled: false,
    });
  });

  it('blocks a quota feature after usage reaches the limit', () => {
    const chatRule =
      DEFAULT_ENTITLEMENT_POLICY.plans[PlanCode.Pro].features[
        FeatureCode.ContextualAiChat
      ];
    const limit = chatRule.mode === 'quota' ? chatRule.limit : 0;

    const entitlements = resolveUserEntitlements({
      plan: PlanCode.Pro,
      status: SubscriptionStatus.Active,
      usage: {
        [FeatureCode.ContextualAiChat]: limit,
      },
    });

    expect(entitlements.features[FeatureCode.ContextualAiChat]).toMatchObject({
      mode: 'quota',
      limit,
      used: limit,
      remaining: 0,
      enabled: false,
    });
  });

  it('drops stale monthly usage when the stored bucket is from another month', () => {
    const usage = materializeCurrentFeatureUsage({
      plan: PlanCode.Pro,
      status: SubscriptionStatus.Active,
      usage: {
        [FeatureCode.AiExplanations]: 11,
        [FeatureCode.EditalParse]: 2,
      },
      usagePeriods: {
        [FeatureCode.AiExplanations]: '2026-02',
        [FeatureCode.EditalParse]: '2026-02',
      },
      now: new Date('2026-03-14T12:00:00.000Z'),
    });

    expect(usage).toBeUndefined();
  });

  it('builds usage periods with lifetime for free edital parse and month for monthly quotas', () => {
    const periods = buildFeatureUsagePeriods({
      plan: PlanCode.Free,
      status: SubscriptionStatus.Active,
      usage: {
        [FeatureCode.EditalParse]: 1,
        [FeatureCode.AiExplanations]: 2,
      },
      now: new Date('2026-03-14T12:00:00.000Z'),
    });

    expect(periods).toEqual({
      [FeatureCode.EditalParse]: 'lifetime',
      [FeatureCode.AiExplanations]: '2026-03',
    });
  });
});
