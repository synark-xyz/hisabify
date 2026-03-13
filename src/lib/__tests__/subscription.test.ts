import { describe, expect, it } from 'vitest';
import { resolvePremiumAccess } from '../subscription';

describe('resolvePremiumAccess', () => {
  it('forces premium on when override is true', () => {
    expect(resolvePremiumAccess({
      disableSubscriptionGating: false,
      subscriptionType: 'base',
      subscriptionStatus: 'inactive',
      referralGrantedUntil: null,
      proAccessOverride: true,
    })).toBe(true);
  });

  it('forces premium off when override is false', () => {
    expect(resolvePremiumAccess({
      disableSubscriptionGating: false,
      subscriptionType: 'pro',
      subscriptionStatus: 'active',
      referralGrantedUntil: '2099-01-01T00:00:00.000Z',
      proAccessOverride: false,
      isSpecialUser: true,
    })).toBe(false);
  });

  it('falls back to active paid subscription when override is null', () => {
    expect(resolvePremiumAccess({
      disableSubscriptionGating: false,
      subscriptionType: 'pro',
      subscriptionStatus: 'active',
      referralGrantedUntil: null,
      proAccessOverride: null,
    })).toBe(true);
  });

  it('falls back to active referral grant when override is null', () => {
    expect(resolvePremiumAccess({
      disableSubscriptionGating: false,
      subscriptionType: 'base',
      subscriptionStatus: 'inactive',
      referralGrantedUntil: '2099-01-01T00:00:00.000Z',
      proAccessOverride: null,
      now: new Date('2026-03-13T00:00:00.000Z'),
    })).toBe(true);
  });

  it('returns false when no override and no premium signals exist', () => {
    expect(resolvePremiumAccess({
      disableSubscriptionGating: false,
      subscriptionType: 'base',
      subscriptionStatus: 'inactive',
      referralGrantedUntil: null,
      proAccessOverride: null,
    })).toBe(false);
  });

  it('turns premium on for everyone when global gating is disabled', () => {
    expect(resolvePremiumAccess({
      disableSubscriptionGating: true,
      subscriptionType: 'base',
      subscriptionStatus: 'inactive',
      referralGrantedUntil: null,
      proAccessOverride: false,
    })).toBe(true);
  });
});
