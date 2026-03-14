import { describe, expect, it } from 'vitest';
import type {
  GetUserSubscriptionStateParams,
  GetUserSubscriptionStateResult,
  SubscriptionStateDataSource,
} from '@aprovamind/application/ports/SubscriptionStateDataSource';
import { GetUserEntitlements } from '@aprovamind/application/use-cases/billing/GetUserEntitlements';
import {
  AccessState,
  FeatureCode,
  PlanCode,
  SubscriptionStatus,
} from '@aprovamind/domain';

class StubSubscriptionStateDataSource implements SubscriptionStateDataSource {
  constructor(
    private readonly resolver: (
      params: GetUserSubscriptionStateParams
    ) => Promise<GetUserSubscriptionStateResult>
  ) {}

  getUserSubscriptionState(
    params: GetUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult> {
    return this.resolver(params);
  }
}

describe('GetUserEntitlements', () => {
  it('loads the subscription state through the port and returns the entitlement snapshot', async () => {
    const dataSource = new StubSubscriptionStateDataSource(async ({ userId }) => ({
      found: true,
      subscription: {
        userId,
        plan: PlanCode.Pro,
        status: SubscriptionStatus.Active,
        usage: {
          [FeatureCode.ContextualAiChat]: 12,
        },
      },
    }));

    const useCase = new GetUserEntitlements(dataSource);
    const result = await useCase.execute({ userId: 'user-1', email: 'user-1@example.com' });

    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.entitlements.catalogPlan).toBe(PlanCode.Pro);
    expect(result.entitlements.effectivePlan).toBe(PlanCode.Pro);
    expect(result.entitlements.accessState).toBe(AccessState.Full);
    expect(result.entitlements.features[FeatureCode.SubjectHealthFull]).toEqual({
      mode: 'boolean',
      enabled: true,
    });
    expect(result.entitlements.features[FeatureCode.ContextualAiChat]).toMatchObject({
      mode: 'quota',
      limit: 60,
      used: 12,
      remaining: 48,
      enabled: true,
    });
  });

  it('passes through subscription not found responses from the data source', async () => {
    const dataSource = new StubSubscriptionStateDataSource(async () => ({
      found: false,
      reason: 'subscription_not_found',
    }));

    const useCase = new GetUserEntitlements(dataSource);
    const result = await useCase.execute({ userId: 'user-1', email: 'user-1@example.com' });

    expect(result).toEqual({
      found: false,
      reason: 'subscription_not_found',
    });
  });

  it('returns free fallback entitlements for expired paid subscriptions', async () => {
    const dataSource = new StubSubscriptionStateDataSource(async ({ userId }) => ({
      found: true,
      subscription: {
        userId,
        plan: PlanCode.Premium,
        status: SubscriptionStatus.Expired,
      },
    }));

    const useCase = new GetUserEntitlements(dataSource);
    const result = await useCase.execute({ userId: 'user-1', email: 'user-1@example.com' });

    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.entitlements.catalogPlan).toBe(PlanCode.Premium);
    expect(result.entitlements.effectivePlan).toBe(PlanCode.Free);
    expect(result.entitlements.accessState).toBe(AccessState.FreeFallback);
    expect(result.entitlements.features[FeatureCode.MultiEdital]).toEqual({
      mode: 'boolean',
      enabled: false,
    });
  });
});
