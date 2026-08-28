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

export const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

/**
 * Open the store's subscription management page — the one-tap cancel path.
 *
 * Cancellation is the store's job, not ours: there is no RevenueCat API that cancels a
 * subscription. `sku` deep-links Play straight to that subscription; without it the user
 * lands on their subscription list. Both stores render a harmless "no subscriptions" page
 * when there is nothing to cancel, so this is safe to show without an entitlement check —
 * which matters, because a missed entitlement is exactly when a user goes looking for it.
 *
 * Same `Browser.open()` (Chrome Custom Tabs) constraint as `openStoreListing()`: https only,
 * never `market://`.
 */
export async function openManageSubscriptions(sku?: string): Promise<void> {
  const url =
    Capacitor.getPlatform() === 'ios'
      ? APPLE_SUBSCRIPTIONS_URL
      : sku
        ? `${PLAY_SUBSCRIPTIONS_URL}?sku=${encodeURIComponent(sku)}&package=${PLAY_STORE_ID}`
        : PLAY_SUBSCRIPTIONS_URL;

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
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
