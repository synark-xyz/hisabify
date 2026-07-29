import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';

export const PLAY_STORE_ID = 'io.synark.hisabify';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;

/**
 * Open the Play Store listing.
 *
 * This is the only way the app asks for a review. The Play In-App Review API is deliberately
 * NOT used: every entry point we have is a button, and Google's guidance is explicit that a
 * button must not drive that API — once the undisclosed quota is hit the dialog is silently
 * skipped while the call still *succeeds*, so the button does nothing at all.
 * https://developer.android.com/guide/playcore/in-app-review
 *
 * Deliberately does NOT attempt a `market://` URL. `Browser.open()` is Chrome Custom Tabs,
 * which pins the intent to the browser package (`pkg=com.android.chrome`), and Chrome cannot
 * handle `market://` — that attempt always died with ActivityNotFoundException. The https
 * listing is app-linked on Android and hands off to the Play Store app on its own.
 *
 * Note the URL always names the production package. Staging builds carry an
 * `.staging` applicationIdSuffix that Play has never distributed.
 */
export async function openStoreListing(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: PLAY_STORE_URL });
    return;
  }

  window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
}

/** Build identifier attached to feedback so reports can be traced to a release. */
export async function getAppVersion(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'web';
  try {
    const info = await CapacitorApp.getInfo();
    return `${info.version} (${info.build})`;
  } catch {
    return 'unknown';
  }
}
