import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { initAdMob, getNativeAppId } from '@/hooks/useAdBanner';
import { shouldShowBanner, getBannerUnitId, createBannerHeightTracker } from '@/lib/ads';
import { logger } from '@/lib/logger';

type AdMobModule = typeof import('@capacitor-community/admob');

let adMobPromise: Promise<AdMobModule | null> | null = null;
function loadAdMob(): Promise<AdMobModule | null> {
  if (!adMobPromise) {
    adMobPromise = import('@capacitor-community/admob').catch((err) => {
      logger.error('[BannerAd] plugin import failed', { err });
      return null;
    });
  }
  return adMobPromise;
}

/** Publishes the reserved height so the nav, FAB and page padding can move out of the way. */
function setBannerHeight(px: number): void {
  document.documentElement.style.setProperty('--ad-banner-h', `${px}px`);
}

/**
 * Anchored AdMob banner for signed-in, non-premium Android users.
 *
 * The banner is a **native view layered over the WebView** — it does not resize it, and it
 * cannot be rendered inside the React tree. So this component renders nothing visible; it owns
 * the native banner's lifecycle and publishes its height to `--ad-banner-h`, which
 * `BottomNavigation`, the FAB and `.pb-page-content` all offset by.
 *
 * Mounted once, in `Layout` — that call site *is* the placement policy: Layout-group routes get
 * a banner, `StandalonePage` routes (settings, profile, legal) never do.
 */
export function BannerAd() {
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();
  const [shown, setShown] = useState(false);

  const wanted = shouldShowBanner({
    platform: Capacitor.getPlatform(),
    signedIn: Boolean(user),
    subscriptionLoading: loading,
    isPremium,
  });

  useEffect(() => {
    let cancelled = false;
    const listeners: PluginListenerHandle[] = [];

    if (!wanted) {
      setBannerHeight(0);
      if (shown) {
        setShown(false);
        loadAdMob()
          .then((mod) => mod?.AdMob.removeBanner())
          .catch((err) => logger.error('[BannerAd] removeBanner failed', { err }));
      }
      return;
    }

    (async () => {
      // Shared + memoised: runs the plugin's mandated
      // initialize -> requestConsentInfo -> showConsentForm order exactly once per session.
      // Google's UMP terms require that consent flow before a single ad is requested.
      const mod = await initAdMob();
      if (!mod || cancelled) return;
      const { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } = mod;
      const nativeAppId = await getNativeAppId();
      if (cancelled) return;

      // Height bookkeeping lives in `createBannerHeightTracker` (pure, unit-tested): the
      // SizeChanged/Loaded pair arrives in an order the plugin does not guarantee, and getting
      // it wrong either leaves a blank strip or lets the banner cover the bottom nav.
      const heights = createBannerHeightTracker(setBannerHeight);

      listeners.push(
        await AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
          heights.onSize(height);
        }),
      );
      listeners.push(
        await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          heights.onLoaded();
        }),
      );
      listeners.push(
        await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
          heights.onFailed();
          logger.error('[BannerAd] banner failed to load', { err });
        }),
      );

      if (cancelled) {
        await Promise.all(listeners.map((l) => l.remove()));
        return;
      }

      await AdMob.showBanner({
        adId: getBannerUnitId(nativeAppId),
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        // BOTTOM_CENTER: the banner sits at the bottom of the screen and the nav is lifted
        // above it via --ad-banner-h. TOP_CENTER would drop it over the app header.
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
      if (!cancelled) setShown(true);
    })().catch((err) => {
      // A failed ad must never break the app — no toast, no rethrow.
      setBannerHeight(0);
      logger.error('[BannerAd] showBanner failed', { err });
    });

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove().catch(() => {}));
    };
    // `shown` is intentionally excluded: it is set inside this effect and re-running on it
    // would tear down and re-request the banner in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  // Unmounting the layout (sign-out, hot reload) must not leave a native banner on screen.
  useEffect(() => {
    return () => {
      setBannerHeight(0);
      loadAdMob()
        .then((mod) => mod?.AdMob.removeBanner())
        .catch(() => {});
    };
  }, []);

  // Nothing to render: the banner is a native view, not a DOM node.
  return null;
}
