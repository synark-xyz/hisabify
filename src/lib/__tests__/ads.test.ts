import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shouldShowBanner,
  getBannerUnitId,
  isProductionAds,
  resolveBannerUnitId,
  createBannerHeightTracker,
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

describe('getBannerUnitId in a production bundle (the staging regression)', () => {
  // The pure resolver above is exhaustive, but the actual bug lived in what
  // `getBannerUnitId` reads out of `import.meta.env`. Stub PROD to reproduce the shipped
  // bundle rather than the vitest default of PROD === false, which passes trivially.
  const REAL_UNIT = 'ca-app-pub-9629558585756546/5567338206';

  beforeEach(() => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_ADMOB_BANNER_ID', REAL_UNIT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('regression: a PROD bundle inside a .staging APK must not request the real unit', () => {
    expect(getBannerUnitId('io.synark.hisabify.staging')).toBe(TEST_BANNER_UNIT_ID);
  });

  it('regression: an unknown/unreadable package must not request the real unit', () => {
    expect(getBannerUnitId(null)).toBe(TEST_BANNER_UNIT_ID);
    expect(getBannerUnitId()).toBe(TEST_BANNER_UNIT_ID);
  });

  it('still serves the real unit in the production APK, so this is not a blanket disable', () => {
    expect(getBannerUnitId(PRODUCTION_APP_ID)).toBe(REAL_UNIT);
  });

  it('keeps initializeForTesting aligned with the unit it will request', () => {
    expect(isProductionAds('io.synark.hisabify.staging')).toBe(false);
    expect(isProductionAds(PRODUCTION_APP_ID)).toBe(true);
  });
});

describe('createBannerHeightTracker', () => {
  const track = () => {
    const seen: number[] = [];
    return { seen, t: createBannerHeightTracker((px) => seen.push(px)) };
  };

  it('reserves the height when SizeChanged arrives BEFORE Loaded', () => {
    // The real device ordering, and the case that shipped broken: gating purely on a `loaded`
    // flag discarded this size event, height stayed 0, and the banner covered the bottom nav.
    const { seen, t } = track();
    t.onSize(50);
    t.onLoaded();
    expect(seen.at(-1)).toBe(50);
  });

  it('reserves the height when Loaded arrives before SizeChanged', () => {
    const { seen, t } = track();
    t.onLoaded();
    t.onSize(50);
    expect(seen.at(-1)).toBe(50);
  });

  it('reserves nothing while only the view has been sized', () => {
    // No fill yet: reserving here is what leaves a blank strip above the nav.
    const { seen, t } = track();
    t.onSize(50);
    expect(seen.at(-1)).toBe(0);
  });

  it('gives the space back when the ad fails to load', () => {
    const { seen, t } = track();
    t.onSize(50);
    t.onLoaded();
    expect(seen.at(-1)).toBe(50);
    t.onFailed();
    expect(seen.at(-1)).toBe(0);
  });

  it('tracks a resize after the ad has loaded', () => {
    const { seen, t } = track();
    t.onSize(50);
    t.onLoaded();
    t.onSize(90);
    expect(seen.at(-1)).toBe(90);
  });

  it('re-reserves when a later request succeeds after a failure', () => {
    const { seen, t } = track();
    t.onSize(50);
    t.onLoaded();
    t.onFailed();
    expect(seen.at(-1)).toBe(0);
    t.onLoaded();
    expect(seen.at(-1)).toBe(50);
  });
});
