import { describe, expect, it } from 'vitest';
import {
  canCreateMorePlans,
  extractPlanTierFromData,
  getCapabilitiesForTier,
} from '@/lib/entitlements';

describe('legacy entitlements helpers', () => {
  it('derives fallback capabilities from the canonical entitlement policy', () => {
    expect(getCapabilitiesForTier('free')).toEqual({
      maxStudyPlans: 1,
      canUseCalendar: false,
      canCreateSimulados: false,
      canUseTreinoRapido: true,
    });

    expect(getCapabilitiesForTier('pro')).toEqual({
      maxStudyPlans: 3,
      canUseCalendar: true,
      canCreateSimulados: true,
      canUseTreinoRapido: true,
    });
  });

  it('uses canonical active-plan limits when deciding if a user can create more plans', () => {
    expect(canCreateMorePlans('free', 0)).toBe(true);
    expect(canCreateMorePlans('free', 1)).toBe(false);
    expect(canCreateMorePlans('pro', 2)).toBe(true);
    expect(canCreateMorePlans('pro', 3)).toBe(false);
  });

  it('extracts plan tier from user_stats payloads', () => {
    expect(extractPlanTierFromData({ subscriptionTier: ' pro ' })).toBe('pro');
    expect(extractPlanTierFromData({})).toBe('free');
  });
});
