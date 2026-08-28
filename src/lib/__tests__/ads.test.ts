import { describe, it, expect } from 'vitest';
import {
  shouldShowBanner,
  getBannerUnitId,
  resolveBannerUnitId,
  TEST_BANNER_UNIT_ID,
  PRODUCTION_APP_ID,
  BannerGate,
} from '@/lib/ads';

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

describe('resolveBannerUnitId', () => {
  const REAL_UNIT = 'ca-app-pub-9629558585756546/5567338206';
  const base = {
    configured: REAL_UNIT,
    prodBundle: true,
    nativeAppId: PRODUCTION_APP_ID,
  };

  it('serves the real unit only from a production bundle inside the production APK', () => {
    expect(resolveBannerUnitId(base)).toBe(REAL_UNIT);
  });

  it('serves the test unit in a staging APK, even from a PROD web bundle', () => {
    // The staging manifest ships Google's TEST AdMob *app* ID; pairing it with a real unit is
    // the mismatch AdMob refuses to serve, and useAdBanner swallows that failure silently.
    expect(resolveBannerUnitId({ ...base, nativeAppId: 'io.synark.hisabify.staging' })).toBe(
      TEST_BANNER_UNIT_ID,
    );
  });

  it('serves the test unit when the native package cannot be read (web, plugin failure)', () => {
    expect(resolveBannerUnitId({ ...base, nativeAppId: null })).toBe(TEST_BANNER_UNIT_ID);
  });

  it('serves the test unit from a non-production web bundle', () => {
    expect(resolveBannerUnitId({ ...base, prodBundle: false })).toBe(TEST_BANNER_UNIT_ID);
  });

  it('serves the test unit when no unit is configured', () => {
    expect(resolveBannerUnitId({ ...base, configured: undefined })).toBe(TEST_BANNER_UNIT_ID);
    expect(resolveBannerUnitId({ ...base, configured: '' })).toBe(TEST_BANNER_UNIT_ID);
  });
});
