import { describe, expect, it } from 'vitest';
import {
  resolveAiCapabilityState,
  resolveAiFailureState,
} from '@aprovamind/application/use-cases/ai/ResolveAiCapabilityState';

describe('resolveAiCapabilityState', () => {
  it('returns enabled when capability is available', () => {
    expect(
      resolveAiCapabilityState({
        capability: 'daily_plan',
        enabled: true,
        hasRequiredContext: true,
        providerConfigured: true,
        providerAvailable: true,
        usageRemaining: 3,
      })
    ).toMatchObject({
      capability: 'daily_plan',
      state: 'enabled',
      usageRemaining: 3,
    });
  });

  it('returns insufficient_data before provider checks when context is missing', () => {
    expect(
      resolveAiCapabilityState({
        capability: 'daily_plan',
        enabled: true,
        hasRequiredContext: false,
        providerConfigured: false,
      })
    ).toMatchObject({
      state: 'insufficient_data',
      nextActions: ['register_activity'],
    });
  });

  it('classifies quota failures as limited', () => {
    expect(
      resolveAiFailureState({
        capability: 'chat',
        error: new Error('rate limit exceeded'),
      })
    ).toMatchObject({
      state: 'limited',
      usageRemaining: 0,
    });
  });
});
