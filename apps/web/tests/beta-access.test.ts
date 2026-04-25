import { describe, expect, it } from 'vitest';
import {
  canSelfRegisterInBeta,
  getBetaAccessMessage,
  getBetaAccessStatus,
  isBetaAllowed,
} from '@/lib/beta-access';

describe('beta access helpers', () => {
  it('recognizes invited emails from the current beta allowlist', () => {
    expect(isBetaAllowed('marsleite@gmail.com')).toBe(true);
    expect(isBetaAllowed('MARSLEITE@GMAIL.COM')).toBe(true);
    expect(isBetaAllowed('nao-liberado@example.com')).toBe(false);
  });

  it('exposes invite-only, allowed, and blocked states', () => {
    expect(getBetaAccessStatus()).toBe('invite_only');
    expect(getBetaAccessStatus('marsleite@gmail.com')).toBe('allowed');
    expect(getBetaAccessStatus('nao-liberado@example.com')).toBe('blocked');
  });

  it('only allows self-registration for open or invited emails', () => {
    expect(canSelfRegisterInBeta('marsleite@gmail.com')).toBe(true);
    expect(canSelfRegisterInBeta('nao-liberado@example.com')).toBe(false);
    expect(getBetaAccessMessage('nao-liberado@example.com')).toContain('ainda nao foi liberado');
  });
});
