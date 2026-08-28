import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { logger } from '@/lib/logger';
import { isProductionAds } from '@/lib/ads';

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
export function getNativeAppId(): Promise<string | null> {
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
export function initAdMob(): Promise<AdMobModule | null> {
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
