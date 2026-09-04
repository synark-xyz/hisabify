import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

// Lazily resolved types — the plugin is only imported on native platforms.
type PurchasesPlugin = typeof import('@revenuecat/purchases-capacitor').Purchases;
type PurchasesPackage = import('@revenuecat/purchases-capacitor').PurchasesPackage;
type PurchasesOfferings = import('@revenuecat/purchases-capacitor').PurchasesOfferings;
type CustomerInfo = import('@revenuecat/purchases-capacitor').CustomerInfo;

/**
 * The RevenueCat entitlement identifier configured in the dashboard.
 * Must match exactly what you typed in RevenueCat → Entitlements → Identifier.
 * Default is 'hisabify-pro' (matching RevenueCat dashboard configuration).
 */
export const ENTITLEMENT_ID =
  (import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID as string | undefined) || 'hisabify-pro';

/**
 * Public SDK key for the platform we are running on.
 * Android is normally configured natively in HisabifyApp.java from BuildConfig, so this is
 * only the fallback path; iOS and web have no native configure() call and rely on it entirely.
 */
function resolveApiKey(): string | undefined {
  const env = import.meta.env;
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    return (env.VITE_REVENUECAT_IOS_API_KEY as string | undefined)
      || (env.VITE_REVENUECAT_API_KEY as string | undefined);
  }
  if (platform === 'android') {
    // No generic fallback: Android is configured natively, and the shared VITE_ key is a
    // test_ Test Store key in most checkouts. Silently configuring release with it would
    // hand every user a fake entitlement.
    return env.VITE_REVENUECAT_ANDROID_API_KEY as string | undefined;
  }
  return env.VITE_REVENUECAT_API_KEY as string | undefined;
}

export type PlanType = 'monthly' | 'yearly' | 'lifetime';

/** Maps app plan names to RevenueCat PackageType strings */
const PLAN_TO_PACKAGE_TYPE: Record<PlanType, string> = {
  monthly: 'MONTHLY',
  yearly: 'ANNUAL',
  lifetime: 'LIFETIME',
};

/**
 * Package identifiers to match as a last resort. RevenueCat names packages built from its
 * standard types `$rc_monthly` / `$rc_annual` / `$rc_lifetime`; a custom package keeps
 * whatever identifier was typed in the dashboard, so accept both spellings.
 */
const PLAN_TO_IDENTIFIERS: Record<PlanType, string[]> = {
  monthly: ['$rc_monthly', 'monthly'],
  yearly: ['$rc_annual', 'yearly', 'annual'],
  lifetime: ['$rc_lifetime', 'lifetime'],
};

interface UseRevenueCatReturn {
  isPremium: boolean;
  isEntitled: boolean;
  revenueCatReady: boolean;
  customerInfo: CustomerInfo | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  purchasePlan: (plan: PlanType) => Promise<void>;
  getOfferings: () => Promise<PurchasesOfferings | null>;
  restorePurchases: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  presentCustomerCenter: () => Promise<void>;
  presentPaywall: () => Promise<void>;
}

async function loadPlugin(): Promise<{ plugin: PurchasesPlugin } | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    // Wrap in a plain object — the Purchases plugin is a Capacitor Proxy that intercepts
    // ALL property access (including `.then`). Returning it directly from an async function
    // causes JS's thenable detection to access `.then`, which fires the native bridge and
    // throws "Purchases.then() is not implemented on android".
    return { plugin: mod.Purchases };
  } catch (err) {
    logger.error('[useRevenueCat] Failed to load @revenuecat/purchases-capacitor', { err });
    return null;
  }
}

async function loadUIPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await import('@revenuecat/purchases-capacitor-ui');
  } catch (err) {
    logger.error('[useRevenueCat] Failed to load @revenuecat/purchases-capacitor-ui', { err });
    return null;
  }
}

function isEntitledFromCustomerInfo(info: CustomerInfo): boolean {
  const active = info.entitlements.active ?? {};
  const entitled = ENTITLEMENT_ID in active;

  // A paying customer with an entitlement under a *different* identifier is the one failure
  // this hook cannot recover from and cannot see: `entitled` is false, the user is charged,
  // and nothing throws. RevenueCat identifiers are typed by hand in the dashboard, so a
  // near-miss ("Hisabify Pro" vs "hisabify-pro") is the likely cause. Name both sides.
  if (!entitled) {
    const activeKeys = Object.keys(active);
    if (activeKeys.length > 0) {
      logger.error('[useRevenueCat] Active entitlement(s) present but none match ENTITLEMENT_ID', {
        expected: ENTITLEMENT_ID,
        actual: activeKeys,
      });
    }
  }

  return entitled;
}

/**
 * Mirrors the live RevenueCat entitlement into `public.users`.
 *
 * Writes *both* directions. An upgrade-only write leaves the mirror permanently stale after an
 * expiry, refund, or cancellation — the row keeps claiming `pro`/`active` forever, and anything
 * that trusts the column (reports, emails, admin views) reads a subscription that no longer
 * exists. `isPremium` itself always reads live RevenueCat state; this column is only a mirror,
 * so it must be allowed to go back down.
 */
/**
 * Cache key for the last value successfully mirrored for a user.
 *
 * Per-user, and persisted: a `useRef` is dropped on every cold start, which would make the
 * two-way sync issue a redundant UPDATE for **every free user on every launch** — a write the
 * old upgrade-only code never made. The entitlement is still read live from RevenueCat on each
 * launch; this only suppresses a write that would set the row to what it already says.
 */
const syncedKey = (userId: string) => `hisabify:subscription-mirror:${userId}`;

function readLastSynced(userId: string): boolean | undefined {
  try {
    const v = localStorage.getItem(syncedKey(userId));
    return v === null ? undefined : v === 'true';
  } catch {
    // Private mode / storage disabled: fall back to always writing. Correctness over cost.
    return undefined;
  }
}

function writeLastSynced(userId: string, entitled: boolean): void {
  try {
    localStorage.setItem(syncedKey(userId), String(entitled));
  } catch {
    /* non-fatal: the mirror is still correct, just re-written next launch */
  }
}

async function syncPremiumToSupabase(userId: string, entitled: boolean): Promise<void> {
  // `public.users` is keyed to auth by `user_id`; `id` is a separate surrogate PK.
  // `.select()` so a zero-row match is visible — PostgREST returns 204/error:null otherwise.
  const { data, error } = await supabase
    .from('users')
    .update({
      // 'base', not 'free': the column carries a CHECK (subscription_type IN ('base','pro')).
      subscription_type: entitled ? 'pro' : 'base',
      subscription_status: entitled ? 'active' : 'inactive',
    })
    .eq('user_id', userId)
    .select('user_id');
  if (error) {
    logger.error('[useRevenueCat] Failed to sync subscription status to Supabase', {
      error: error.message,
      entitled,
    });
    return;
  }
  if (!data?.length) {
    logger.warn('[useRevenueCat] Subscription sync matched 0 rows in public.users', { userId });
    return;
  }
  // Recorded only after the row is confirmed updated, so a failed write is retried next time
  // rather than being remembered as done.
  writeLastSynced(userId, entitled);
}

export function useRevenueCat(): UseRevenueCatReturn {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isPremium, setIsPremium] = useState(false);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const pluginRef = useRef<PurchasesPlugin | null>(null);
  // Keyed on the user id, not the user object (which is re-created on every token refresh)
  // and not a one-shot boolean: an account switch on the same device must re-run logIn,
  // otherwise the second user inherits the first user's entitlements.
  const userId = user?.id;

  // Mirrors `isPremium` for callbacks that must read it without depending on it —
  // `presentPaywall` needs the pre-paywall value to tell an upgrade from an existing Pro.
  const isPremiumRef = useRef(false);

  // In-flight guard so a burst of identical customer-info events in one session collapses to a
  // single write. The durable across-launch check is `readLastSynced`.
  const syncingRef = useRef<boolean | undefined>(undefined);

  const updatePremiumState = useCallback((info: CustomerInfo) => {
    const entitled = isEntitledFromCustomerInfo(info);
    isPremiumRef.current = entitled;
    setIsPremium(entitled);
    setCustomerInfo(info);

    // Mirror every transition, not just upgrades. Expiry and refund arrive here through the
    // customer-info listener and the foreground refresh, and they are the cases an
    // upgrade-only sync silently misses — leaving the row stuck at pro/active forever.
    if (userId && syncingRef.current !== entitled && readLastSynced(userId) !== entitled) {
      syncingRef.current = entitled;
      void syncPremiumToSupabase(userId, entitled);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // Signed out: drop the cached entitlement so the next user never sees it.
      isPremiumRef.current = false;
      setIsPremium(false);
      setCustomerInfo(null);
      // Next user on this device must be synced from scratch, not compared to the last one's.
      // The persisted marker is per-user, so it is deliberately left alone.
      syncingRef.current = undefined;
      return;
    }

    let cancelled = false;
    const removers: Array<() => void> = [];
    // Drains so a remover can never run twice, whichever side (cleanup or the async
    // tail below) gets there first.
    const removeListeners = () => { while (removers.length) removers.pop()!(); };

    (async () => {
      const loaded = await loadPlugin();
      if (!loaded || cancelled) {
        if (!cancelled) setRevenueCatReady(true);
        return;
      }
      const Purchases = loaded.plugin;

      try {
        // Android configures natively at process start (HisabifyApp.java). iOS has no such
        // hook, so ask the SDK instead of assuming: every method below rejects with
        // "Purchases must be configured before calling this function" otherwise.
        const { isConfigured } = await Purchases.isConfigured();

        if (!isConfigured) {
          const apiKey = resolveApiKey();
          if (!apiKey) {
            logger.error('[useRevenueCat] No RevenueCat API key for platform', {
              platform: Capacitor.getPlatform(),
            });
            if (!cancelled) setRevenueCatReady(true);
            return;
          }
          await Purchases.configure({ apiKey, appUserID: userId });
        } else {
          // Already configured (anonymous, from the native hook): bind to this user so
          // entitlements are user-scoped and survive a reinstall / device change.
          await Purchases.logIn({ appUserID: userId });
        }

        if (import.meta.env.DEV) {
          const { LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        }

        // Set before the first await below so purchase/restore callers that race the
        // initial getCustomerInfo() still find a usable plugin.
        pluginRef.current = Purchases;

        const { customerInfo: info } = await Purchases.getCustomerInfo();
        if (!cancelled) {
          updatePremiumState(info);
          setRevenueCatReady(true);
        }

        // Refresh entitlement on app foreground (handles post-purchase from billing sheet)
        const appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (!isActive || !pluginRef.current) return;
          try {
            const { customerInfo: freshInfo } = await pluginRef.current.getCustomerInfo();
            updatePremiumState(freshInfo);
          } catch (err) {
            logger.error('[useRevenueCat] foreground refresh failed', { err });
          }
        });
        removers.push(() => { void appStateListener.remove(); });

        // Renewal / expiry / refund that lands while the app is in the foreground.
        const callbackId = await Purchases.addCustomerInfoUpdateListener((freshInfo) => {
          updatePremiumState(freshInfo);
        });
        removers.push(() => {
          void Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: callbackId });
        });

        if (cancelled) removeListeners();
      } catch (err) {
        if (!cancelled) {
          logger.error('[useRevenueCat] init failed', { err });
          setRevenueCatReady(true);
        }
      }
    })().catch((err) => {
      logger.error('[useRevenueCat] unhandled init error', { err });
      if (!cancelled) setRevenueCatReady(true);
    });

    return () => {
      cancelled = true;
      removeListeners();
    };
  }, [userId, updatePremiumState]);

  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    const Purchases = pluginRef.current;
    if (!Purchases) return;
    try {
      const { customerInfo: info } = await Purchases.getCustomerInfo();
      updatePremiumState(info);
    } catch (err) {
      logger.error('[useRevenueCat] refreshCustomerInfo failed', { err });
    }
  }, [updatePremiumState]);

  const getOfferings = useCallback(async (): Promise<PurchasesOfferings | null> => {
    const Purchases = pluginRef.current;
    if (!Purchases) {
      logger.error('[useRevenueCat] getOfferings called before plugin is ready');
      return null;
    }
    try {
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (err) {
      logger.error('[useRevenueCat] getOfferings failed', { err });
      return null;
    }
  }, []);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<void> => {
      const Purchases = pluginRef.current;
      if (!Purchases) throw new Error('RevenueCat is not available on this platform.');
      if (!user) throw new Error('You must be signed in to upgrade.');

      const { customerInfo: info } = await Purchases.purchasePackage({ aPackage: pkg });
      updatePremiumState(info);

      if (isEntitledFromCustomerInfo(info)) {
        toast({ title: 'Welcome to Hisabify Pro!', description: 'Your subscription is now active.' });
      }
    },
    [user, toast, updatePremiumState],
  );

  const purchasePlan = useCallback(
    async (plan: PlanType): Promise<void> => {
      const Purchases = pluginRef.current;
      if (!Purchases) throw new Error('RevenueCat is not available on this platform.');
      if (!user) throw new Error('You must be signed in to upgrade.');

      // Call the SDK directly — don't go through the getOfferings() wrapper which silently
      // returns null on any error and obscures the real failure reason.
      let offeringsData: PurchasesOfferings;
      try {
        offeringsData = await Purchases.getOfferings();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[useRevenueCat] purchasePlan: getOfferings failed', { err });
        throw new Error(`Could not load subscription options: ${message}`);
      }

      // Prefer the "current" offering; fall back to "default" then the first available.
      const offering =
        offeringsData?.current ??
        offeringsData?.all?.['hisabify-pro'] ??
        (offeringsData?.all ? Object.values(offeringsData.all)[0] : null);

      logger.info('[useRevenueCat] purchasePlan: offerings loaded', {
        keys: offeringsData?.all ? Object.keys(offeringsData.all) : [],
        current: offering?.identifier,
        packages: offering?.availablePackages?.map(p => ({ id: p.identifier, type: p.packageType })) || [],
      });

      if (!offering) {
        logger.error('[useRevenueCat] purchasePlan: no offering found', {
          keys: offeringsData?.all ? Object.keys(offeringsData.all) : [],
        });
        throw new Error('No subscription packages are available right now. Please try again later.');
      }

      // Use the convenience properties first (monthly/annual) — they are the most direct path.
      // Fall back to searching availablePackages by packageType or identifier.
      const CONVENIENCE: Partial<Record<PlanType, PurchasesPackage | null>> = {
        monthly: offering.monthly,
        yearly: offering.annual,
        lifetime: offering.lifetime,
      };

      const pkg =
        CONVENIENCE[plan] ??
        offering.availablePackages.find((p) => p.packageType === PLAN_TO_PACKAGE_TYPE[plan]) ??
        offering.availablePackages.find((p) => PLAN_TO_IDENTIFIERS[plan].includes(p.identifier));

      logger.info('[useRevenueCat] purchasePlan: package resolved', {
        plan,
        packageId: pkg?.identifier,
        packageType: pkg?.packageType,
      });

      if (!pkg) {
        logger.error('[useRevenueCat] purchasePlan: package not found', {
          plan,
          offeringId: offering.identifier,
          available: offering.availablePackages.map((p) => ({ id: p.identifier, type: p.packageType })),
        });
        throw new Error(`The ${plan} plan is not available right now.`);
      }

      await purchasePackage(pkg);
    },
    [user, purchasePackage],
  );

  const restorePurchases = useCallback(async (): Promise<void> => {
    const Purchases = pluginRef.current;
    if (!Purchases) {
      toast({ title: 'Not available', description: 'Purchases can only be restored on the mobile app.', variant: 'destructive' });
      return;
    }
    if (!user) throw new Error('You must be signed in to restore purchases.');

    try {
      const { customerInfo: info } = await Purchases.restorePurchases();
      updatePremiumState(info);
      const isNowPremium = isEntitledFromCustomerInfo(info);

      if (isNowPremium) {
        toast({ title: 'Purchases restored', description: 'Your Pro subscription has been restored.' });
      } else {
        toast({ title: 'No active subscription found', description: 'No previous Pro subscription was found for this account.', variant: 'destructive' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore purchases';
      logger.error('[useRevenueCat] restorePurchases failed', { err });
      toast({ title: 'Restore failed', description: message, variant: 'destructive' });
    }
  }, [user, toast, updatePremiumState]);

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const ui = await loadUIPlugin();
      if (!ui) return;
      await ui.RevenueCatUI.presentCustomerCenter();
      // Refresh after customer center in case user cancelled/changed subscription
      await refreshCustomerInfo();
    } catch (err) {
      logger.error('[useRevenueCat] presentCustomerCenter failed', { err });
    }
  }, [refreshCustomerInfo]);

  const presentPaywall = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    const ui = await loadUIPlugin();
    if (!ui) return;

    // Fetch the offering explicitly so we don't rely on RC's "current" pointer
    let offering: import('@revenuecat/purchases-capacitor').PurchasesOffering | undefined;
    const Purchases = pluginRef.current;
    if (Purchases) {
      try {
        const offerings = await Purchases.getOfferings();
        offering =
          offerings.current ??
          (offerings.all ? Object.values(offerings.all)[0] : undefined) ??
          undefined;
      } catch (err) {
        logger.error('[useRevenueCat] presentPaywall: getOfferings failed', { err });
      }
    }

    if (!offering) {
      logger.error('[useRevenueCat] presentPaywall: no offering found');
      toast({
        title: 'Subscription unavailable',
        description: 'No subscription options are available right now. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    // Snapshot before the paywall so we can tell "just upgraded" from "already Pro".
    const wasEntitled = isPremiumRef.current;

    try {
      // DO NOT pass `listener` (or `purchaseLogic`) here. The Capacitor plugin turns their
      // presence into `hasPaywallListener: true`, and the native side reacts with
      //   val listener = if (hasPaywallListener) createPaywallListenerWrapper() else null
      // That wrapper GATES every purchase on a JS round-trip — native fires
      // `onPurchaseInitiated` and blocks until JS answers `resumePurchaseInitiated`. While
      // PaywallActivity is in front that answer never arrives, so the CTA spins forever, the
      // activity hits "top resumed state loss timeout", and the process is killed. Verified on
      // device: `resumePurchaseInitiated` never appears in logcat, not even after dismissal.
      // With no listener the native wrapper is never installed and the purchase completes
      // entirely natively — which is why the state below is read back rather than pushed in.
      await ui.RevenueCatUI.presentPaywall({ offering, displayCloseButton: true });
    } catch (err) {
      logger.error('[useRevenueCat] presentPaywall failed', { err });
    }

    // The paywall is dismissed, so the WebView is foreground again and the bridge is reliable.
    // `addCustomerInfoUpdateListener` may have already applied this; re-reading is idempotent.
    const Refreshed = pluginRef.current;
    if (!Refreshed) return;

    let info: CustomerInfo;
    try {
      ({ customerInfo: info } = await Refreshed.getCustomerInfo());
    } catch (err) {
      logger.error('[useRevenueCat] presentPaywall: post-dismiss refresh failed', { err });
      return;
    }
    updatePremiumState(info);

    if (isEntitledFromCustomerInfo(info) && !wasEntitled) {
      toast({ title: 'Welcome to Hisabify Pro!', description: 'Your subscription is now active.' });
    }
    // No `user` dependency: the Supabase mirror is written by `updatePremiumState` now, so this
    // callback only shows a toast.
  }, [updatePremiumState, toast]);

  return {
    isPremium,
    isEntitled: isPremium,
    revenueCatReady,
    customerInfo,
    purchasePackage,
    purchasePlan,
    getOfferings,
    restorePurchases,
    refreshCustomerInfo,
    presentCustomerCenter,
    presentPaywall,
  };
}
