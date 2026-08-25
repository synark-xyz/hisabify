import { describe, it, expect } from 'vitest';
import { shouldShowBanner, getBannerUnitId, TEST_BANNER_UNIT_ID, BannerGate } from '@/lib/ads';

const freeAndroidUser: BannerGate = {
  platform: 'android',
  signedIn: true,
  subscriptionLoading: false,
  isPremium: false,
};

function gate(overrides: Partial<BannerGate> = {}): BannerGate {
  return { ...freeAndroidUser, ...overrides };
}

describe('shouldShowBanner', () => {
  it('shows for a signed-in free user on Android', () => {
    expect(shouldShowBanner(gate())).toBe(true);
  });

  it('never shows to a premium user', () => {
    expect(shouldShowBanner(gate({ isPremium: true }))).toBe(false);
  });

  it('waits for the subscription to resolve, so Pro users get no banner flash', () => {
    expect(shouldShowBanner(gate({ subscriptionLoading: true }))).toBe(false);
    // …even though the entitlement has not landed yet and isPremium still reads false.
    expect(shouldShowBanner(gate({ subscriptionLoading: true, isPremium: false }))).toBe(false);
  });

  it('is Android-only', () => {
    expect(shouldShowBanner(gate({ platform: 'ios' }))).toBe(false);
    expect(shouldShowBanner(gate({ platform: 'web' }))).toBe(false);
  });

  it('does not show while signed out', () => {
    expect(shouldShowBanner(gate({ signedIn: false }))).toBe(false);
  });
});

describe('getBannerUnitId', () => {
  it('falls back to the test unit when no unit ID is configured', () => {
    // vitest runs with import.meta.env.PROD === false, which forces the fallback regardless.
    expect(getBannerUnitId()).toBe(TEST_BANNER_UNIT_ID);
  });
});
