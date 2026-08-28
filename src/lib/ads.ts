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
 * The package name of the production APK. Debug/staging builds carry a `.staging`
 * `applicationIdSuffix`, and — crucially — a `manifestPlaceholders` AdMob **application** ID of
 * Google's test app (`ca-app-pub-3940256099942544~3347511713`).
 *
 * That native app ID is what makes the Vite `PROD` flag insufficient on its own:
 * `npm run build && npx cap sync` produces a PROD web bundle no matter which APK variant wraps
 * it, so a staging APK would pair Google's test *app* ID with our real ad *unit*. AdMob refuses
 * that combination and `useAdBanner` swallows the failure by design, so ads silently vanish.
 * The package name is the only signal the web layer has for which native variant it is inside.
 */
export const PRODUCTION_APP_ID = 'io.synark.hisabify';

export interface BannerUnitInput {
  /** `import.meta.env.VITE_ADMOB_BANNER_ID`. */
  configured: string | undefined;
  /** `import.meta.env.PROD` — the web bundle was built for production. */
  prodBundle: boolean;
  /**
   * Native package name from `App.getInfo().id`, or `null` on web / when it cannot be read.
   * Null is treated as "not the production APK": failing closed costs test ads, failing open
   * costs the AdMob account.
   */
  nativeAppId: string | null;
}

/**
 * Pure unit-ID resolution. Real ads require *all three*: a configured unit, a production web
 * bundle, and the production native package (which is the one holding the real AdMob app ID).
 */
export function resolveBannerUnitId({ configured, prodBundle, nativeAppId }: BannerUnitInput): string {
  if (!configured || !prodBundle) return TEST_BANNER_UNIT_ID;
  if (nativeAppId !== PRODUCTION_APP_ID) return TEST_BANNER_UNIT_ID;
  return configured;
}

/**
 * The banner ad unit to request, for a given native package name.
 * Falls back to the test unit whenever anything about the build isn't production.
 */
export function getBannerUnitId(nativeAppId: string | null = null): string {
  return resolveBannerUnitId({
    configured: import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined,
    prodBundle: import.meta.env.PROD,
    nativeAppId,
  });
}

/** True when we're allowed to serve real ads — mirrors the unit-ID fallback above. */
export function isProductionAds(nativeAppId: string | null = null): boolean {
  return getBannerUnitId(nativeAppId) !== TEST_BANNER_UNIT_ID;
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

/**
 * Tracks the two AdMob events that decide how much space the banner reserves.
 *
 * The pair arrives in an order the plugin does not guarantee, and in practice `SizeChanged`
 * fires *before* `Loaded` — the banner view is measured as soon as it is laid out, whether or
 * not an ad ever fills it. That makes both naive versions wrong:
 *
 *   - reserve on `SizeChanged` alone  -> blank strip above the nav when the request fails
 *   - reserve only while `loaded`     -> the size event is discarded, height stays 0, and the
 *                                        banner renders on top of the bottom nav
 *
 * So remember the last reported size and apply it on whichever event completes the pair.
 */
export function createBannerHeightTracker(onChange: (px: number) => void) {
  let loaded = false;
  let lastHeight = 0;

  const apply = () => onChange(loaded ? lastHeight : 0);

  return {
    /** `BannerAdPluginEvents.SizeChanged` */
    onSize(height: number) {
      lastHeight = height;
      apply();
    },
    /** `BannerAdPluginEvents.Loaded` */
    onLoaded() {
      loaded = true;
      apply();
    },
    /** `BannerAdPluginEvents.FailedToLoad` — give the space back. */
    onFailed() {
      loaded = false;
      apply();
    },
  };
}
