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
export const ENTITLEMENT_ID = 'hisabify-pro';

export type PlanType = 'monthly' | 'yearly' | 'lifetime';

/** Maps app plan names to RevenueCat PackageType strings */
const PLAN_TO_PACKAGE_TYPE: Record<PlanType, string> = {
  monthly: 'MONTHLY',
  yearly: 'ANNUAL',
  lifetime: 'LIFETIME',
};

/** Maps app plan names to RevenueCat product identifiers (from RevenueCat dashboard) */
const PLAN_TO_IDENTIFIER: Record<PlanType, string> = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
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
  return ENTITLEMENT_ID in (info.entitlements.active ?? {});
}

async function syncPremiumToSupabase(userId: string): Promise<void> {
  // `public.users` is keyed to auth by `user_id`; `id` is a separate surrogate PK.
  // `.select()` so a zero-row match is visible — PostgREST returns 204/error:null otherwise.
  const { data, error } = await supabase
    .from('users')
    .update({ subscription_type: 'pro', subscription_status: 'active' })
    .eq('user_id', userId)
    .select('user_id');
  if (error) {
    logger.error('[useRevenueCat] Failed to sync premium status to Supabase', { error: error.message });
  } else if (!data?.length) {
    logger.warn('[useRevenueCat] Premium sync matched 0 rows in public.users', { userId });
  }
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

  const updatePremiumState = useCallback((info: CustomerInfo) => {
    const entitled = isEntitledFromCustomerInfo(info);
    setIsPremium(entitled);
    setCustomerInfo(info);
  }, []);

  useEffect(() => {
    if (!userId) {
      // Signed out: drop the cached entitlement so the next user never sees it.
      setIsPremium(false);
      setCustomerInfo(null);
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
        if (Capacitor.isNativePlatform()) {
          // Native: RC is already configured in HisabifyApp.java at app startup.
          // Log in the current user so entitlements are user-scoped.
          await Purchases.logIn({ appUserID: userId });
        } else {
          // Web: unreachable today — loadPlugin() returns null off-native, so we bail above.
          const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;
          await Purchases.configure({ apiKey, appUserID: userId });
          if (import.meta.env.DEV) {
            const { LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          }
        }

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
        await syncPremiumToSupabase(user.id);
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
        offering.availablePackages.find((p) => p.identifier === PLAN_TO_IDENTIFIER[plan]);

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
        await syncPremiumToSupabase(user.id);
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

    try {
      await ui.RevenueCatUI.presentPaywall({
        offering,
        displayCloseButton: true,
        listener: {
          onPurchaseCompleted: async ({ customerInfo: info }) => {
            updatePremiumState(info);
            if (isEntitledFromCustomerInfo(info) && user) {
              await syncPremiumToSupabase(user.id);
              toast({ title: 'Welcome to Hisabify Pro!', description: 'Your subscription is now active.' });
            }
          },
          onRestoreCompleted: ({ customerInfo: info }) => {
            updatePremiumState(info);
            if (isEntitledFromCustomerInfo(info)) {
              toast({ title: 'Purchases restored', description: 'Your Pro subscription has been restored.' });
            } else {
              toast({ title: 'Nothing to restore', description: 'No active Pro subscription found for this account.', variant: 'destructive' });
            }
          },
          onRestoreError: () => {
            toast({ title: 'Restore failed', description: 'Could not restore purchases. Please try again.', variant: 'destructive' });
          },
        },
      });
    } catch (err) {
      logger.error('[useRevenueCat] presentPaywall failed', { err });
    }

    // Always refresh after paywall closes to capture any state changes
    await refreshCustomerInfo();
  }, [user, updatePremiumState, refreshCustomerInfo, toast]);

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
