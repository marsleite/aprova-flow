import { describe, expect, it } from 'vitest';
import { getSandboxContextMessage } from '@/lib/stability/core-flow';
import { PLAN_COLORS } from '@/types';

describe('ui safety guardrails', () => {
  it('keeps the plan color palette visually distinct and uniquely keyed', () => {
    const hexValues = PLAN_COLORS.map((color) => color.hex);
    const names = PLAN_COLORS.map((color) => color.name);

    expect(new Set(hexValues).size).toBe(hexValues.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only shows a sandbox notice when a scenario is actually active', () => {
    expect(
      getSandboxContextMessage({
        usingSandbox: false,
        sandboxScenarioUserId: 'premium-user',
      })
    ).toBeNull();

    expect(
      getSandboxContextMessage({
        usingSandbox: true,
        sandboxScenarioUserId: 'premium-user',
      })
    ).toContain('premium-user');
  });
});
