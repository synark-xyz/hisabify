import { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { logger } from '@/lib/logger';
import { getBannerUnitId, isProductionAds, shouldShowBanner } from '@/lib/ads';

type AdMobModule = typeof import('@capacitor-community/admob');

/**
 * Native package name, resolved once. This is what tells the web layer which APK variant it is
 * running inside: a `.staging` build ships Google's *test* AdMob application ID in its manifest,
 * and pairing that with our real ad unit makes AdMob refuse to serve — silently, because a
 * failed ad must never break the app. `import.meta.env.PROD` cannot see this: `npm run build`
 * emits a PROD bundle regardless of which variant later wraps it.
 *
 * Resolves to `null` on web or if the plugin call fails, which the ads module treats as
 * "not production" and therefore serves test ads.
 */
let appIdPromise: Promise<string | null> | null = null;
function getNativeAppId(): Promise<string | null> {
  if (!appIdPromise) {
    appIdPromise = (async () => {
      if (!Capacitor.isNativePlatform()) return null;
      try {
        const { id } = await CapacitorApp.getInfo();
        return id ?? null;
      } catch (err) {
        logger.error('[useAdBanner] App.getInfo failed; falling back to test ads', { err });
        return null;
      }
    })();
  }
  return appIdPromise;
}

/** Lazy-import so the AdMob SDK never lands in the web bundle. */
let modulePromise: Promise<AdMobModule | null> | null = null;
function loadAdMob(): Promise<AdMobModule | null> {
  if (!modulePromise) {
    modulePromise = import('@capacitor-community/admob').catch((err) => {
      logger.error('[useAdBanner] plugin import failed', { err });
      return null;
    });
  }
  return modulePromise;
}

/**
 * SDK init + consent, run at most once per app session. Both the banner and the privacy-options
 * entry point need this to have happened, so it is shared and memoised.
 */
let consentPromise: Promise<AdMobModule | null> | null = null;
function initAdMob(): Promise<AdMobModule | null> {
  if (!consentPromise) {
    consentPromise = (async () => {
      const mod = await loadAdMob();
      if (!mod) return null;
      const { AdMob, AdmobConsentStatus } = mod;
      const nativeAppId = await getNativeAppId();

      // Order is mandated by the plugin: initialize → requestConsentInfo → showConsentForm.
      await AdMob.initialize({ initializeForTesting: !isProductionAds(nativeAppId) });

      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }
      return mod;
    })().catch((err) => {
      logger.error('[useAdBanner] init/consent failed', { err });
      return null;
    });
  }
  return consentPromise;
}

/**
 * The banner is a native view laid over the bottom of the WebView — it does not resize the
 * WebView, so the web layer has to move out of its way. Everything that sits at the bottom
 * (`BottomNavigation`, the FAB, `.pb-page-content`) offsets by this variable, which stays at 0
 * whenever no banner is showing.
 *
 * The plugin reports the size in dp, which is 1:1 with CSS px inside a Capacitor WebView.
 */
function setBannerHeight(px: number): void {
  document.documentElement.style.setProperty('--ad-banner-h', `${px}px`);
}

/**
 * Shows an anchored AdMob banner to signed-in, non-premium Android users.
 *
 * Mounted once, in `Layout` — which is also the placement policy: Layout-group routes get a
 * banner, `StandalonePage` routes (settings, profile, legal) never do.
 */
export function useAdBanner(): void {
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();
  const shownRef = useRef(false);

  const wanted = shouldShowBanner({
    platform: Capacitor.getPlatform(),
    signedIn: Boolean(user),
    subscriptionLoading: loading,
    isPremium,
  });

  useEffect(() => {
    let cancelled = false;
    let sizeListener: PluginListenerHandle | null = null;

    // Covers both "never wanted" and "just upgraded to Pro" — the latter has a banner to remove.
    if (!wanted) {
      if (shownRef.current) {
        shownRef.current = false;
        setBannerHeight(0);
        loadAdMob()
          .then((mod) => mod?.AdMob.removeBanner())
          .catch((err) => logger.error('[useAdBanner] removeBanner failed', { err }));
      }
      return;
    }

    (async () => {
      const mod = await initAdMob();
      if (!mod || cancelled) return;
      const { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } = mod;

      sizeListener = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
        setBannerHeight(height);
      });
      if (cancelled) {
        await sizeListener.remove();
        return;
      }

      await AdMob.showBanner({
        adId: getBannerUnitId(await getNativeAppId()),
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
      shownRef.current = true;
    })().catch((err) => {
      // A failed ad must never break the app — no toast, no rethrow.
      logger.error('[useAdBanner] showBanner failed', { err });
    });

    return () => {
      cancelled = true;
      sizeListener?.remove().catch(() => {});
    };
  }, [wanted]);

  // Unmounting the layout (sign-out, hot reload) must not leave a native banner on screen.
  useEffect(() => {
    return () => {
      if (!shownRef.current) return;
      shownRef.current = false;
      setBannerHeight(0);
      loadAdMob()
        .then((mod) => mod?.AdMob.removeBanner())
        .catch(() => {});
    };
  }, []);
}

/**
 * Google's UMP terms require a persistent entry point for users who were shown a consent form to
 * change their choice. Surfaced on `/profile/data`.
 *
 * Deliberately independent of `useAdBanner`: that hook lives in `Layout`, and `/profile/data` is
 * a `StandalonePage` route outside it. `requestConsentInfo()` is cached by the UMP SDK, so
 * asking again here is cheap.
 */
export function useAdPrivacyOptions(): { required: boolean; showForm: () => Promise<void> } {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let cancelled = false;

    (async () => {
      const mod = await initAdMob();
      if (!mod || cancelled) return;
      const info = await mod.AdMob.requestConsentInfo();
      // Compared as a string: the plugin's `consent/index` does not re-export the
      // PrivacyOptionsRequirementStatus enum, so it is unreachable from the package root.
      if (!cancelled) setRequired(String(info.privacyOptionsRequirementStatus) === 'REQUIRED');
    })().catch((err) => logger.error('[useAdPrivacyOptions] consent info failed', { err }));

    return () => {
      cancelled = true;
    };
  }, []);

  const showForm = useCallback(async () => {
    const mod = await initAdMob();
    await mod?.AdMob.showPrivacyOptionsForm();
  }, []);

  return { required, showForm };
}
