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
      maxStudyPlans: 1,
      canUseCalendar: true,
      canCreateSimulados: true,
      canUseTreinoRapido: true,
    });

    expect(getCapabilitiesForTier('premium')).toEqual({
      maxStudyPlans: 3,
      canUseCalendar: true,
      canCreateSimulados: true,
      canUseTreinoRapido: true,
    });
  });

  it('uses canonical active-plan limits when deciding if a user can create more plans', () => {
    expect(canCreateMorePlans('free', 0)).toBe(true);
    expect(canCreateMorePlans('free', 1)).toBe(false);
    expect(canCreateMorePlans('pro', 1)).toBe(false);
    expect(canCreateMorePlans('premium', 2)).toBe(true);
    expect(canCreateMorePlans('premium', 3)).toBe(false);
  });

  it('still extracts plan tier from legacy user_stats payloads', () => {
    expect(extractPlanTierFromData({ subscriptionTier: ' premium ' })).toBe('premium');
    expect(extractPlanTierFromData({})).toBe('free');
  });
});
