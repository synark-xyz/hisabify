import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { initAdMob, getNativeAppId } from '@/hooks/useAdBanner';
import { shouldShowBanner, getBannerUnitId } from '@/lib/ads';
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

      // SizeChanged fires when the banner *view* is laid out, which happens before — and
      // independently of — an ad actually filling it. Reserving space on that alone leaves a
      // blank strip above the nav whenever the request fails (no fill, no network), which is
      // worse than no ad at all: broken layout with nothing in the gap. So only reserve space
      // once an ad has really loaded, and give it back the moment one fails.
      let loaded = false;

      listeners.push(
        await AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
          if (loaded) setBannerHeight(height);
        }),
      );
      listeners.push(
        await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          loaded = true;
        }),
      );
      listeners.push(
        await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
          loaded = false;
          setBannerHeight(0);
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
