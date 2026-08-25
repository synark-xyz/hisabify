/**
 * Ad configuration and the pure "should we show a banner" decision.
 *
 * Side effects (SDK init, consent, showing the banner) live in `useAdBanner`; this module is
 * pure so the gating rules are testable without a device.
 */

/**
 * Google's official adaptive-banner test unit. Anything that isn't a signed production build
 * uses this.
 *
 * This is a safety mechanism, not a convenience: serving — or worse, clicking — real ads from a
 * debug build is what gets an AdMob account suspended, and there is no undo for that.
 */
export const TEST_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';

/**
 * The banner ad unit to request. Falls back to the test unit whenever
 * `VITE_ADMOB_BANNER_ID` is unset or the bundle is not a production build.
 */
export function getBannerUnitId(): string {
  const configured = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined;
  if (!configured || !import.meta.env.PROD) return TEST_BANNER_UNIT_ID;
  return configured;
}

/** True when we're allowed to serve real ads — mirrors the unit-ID fallback above. */
export function isProductionAds(): boolean {
  return getBannerUnitId() !== TEST_BANNER_UNIT_ID;
}

export interface BannerGate {
  /** `Capacitor.getPlatform()` — 'android' | 'ios' | 'web'. */
  platform: string;
  /** A signed-in user is required: entitlement is user-scoped. */
  signedIn: boolean;
  /** `useSubscription().loading` — true until RevenueCat has resolved. */
  subscriptionLoading: boolean;
  isPremium: boolean;
}

/**
 * Ads are Android-only for now (iOS needs ATT + SKAdNetwork + a privacy manifest), and are the
 * free tier's side of the deal — Pro removes them.
 */
export function shouldShowBanner({
  platform,
  signedIn,
  subscriptionLoading,
  isPremium,
}: BannerGate): boolean {
  if (platform !== 'android') return false;
  if (!signedIn) return false;
  // Waiting for RevenueCat matters: without it a Pro user sees a banner flash on every cold
  // start, before the entitlement arrives.
  if (subscriptionLoading) return false;
  return !isPremium;
}
