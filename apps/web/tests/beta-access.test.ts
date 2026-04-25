import { describe, expect, it } from 'vitest';
import {
  getBetaAccessMessage,
  isBetaAccessRestricted,
  type BetaAccessStatus,
} from '@/lib/beta-access';

describe('beta access helpers', () => {
  it('beta is invite-only while BETA_INVITE_ONLY=true', () => {
    expect(isBetaAccessRestricted()).toBe(true);
  });

  it('getBetaAccessMessage returns empty string for open status', () => {
    expect(getBetaAccessMessage('open')).toBe('');
  });

  it('getBetaAccessMessage returns correct messages per status', () => {
    expect(getBetaAccessMessage('allowed')).toContain('liberado para o beta');
    expect(getBetaAccessMessage('blocked')).toContain('ainda nao foi liberado');
    expect(getBetaAccessMessage('invite_only')).toContain('por convite');
  });

  it('getBetaAccessMessage covers all BetaAccessStatus values', () => {
    const statuses: BetaAccessStatus[] = ['open', 'invite_only', 'allowed', 'blocked'];
    for (const status of statuses) {
      expect(() => getBetaAccessMessage(status)).not.toThrow();
    }
  });
});
