import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

// Lazily resolved types — the plugin is only imported on native platforms.
// On web the module may not resolve at all, so we keep the import dynamic.
type PurchasesPlugin = typeof import('@revenuecat/purchases-capacitor').Purchases;
type PurchasesPackage = import('@revenuecat/purchases-capacitor').PurchasesPackage;
type PurchasesOfferings = import('@revenuecat/purchases-capacitor').PurchasesOfferings;

interface UseRevenueCatReturn {
  isPremium: boolean;
  revenueCatReady: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  getOfferings: () => Promise<PurchasesOfferings | null>;
  restorePurchases: () => Promise<void>;
}

async function loadPlugin(): Promise<PurchasesPlugin | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    return mod.Purchases;
  } catch (err) {
    logger.error('[useRevenueCat] Failed to load @revenuecat/purchases-capacitor', { err });
    return null;
  }
}

async function syncPremiumToSupabase(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      subscription_type: 'pro',
      subscription_status: 'active',
    })
    .eq('id', userId);

  if (error) {
    logger.error('[useRevenueCat] Failed to sync premium status to Supabase', {
      error: error.message,
    });
  }
}

export function useRevenueCat(): UseRevenueCatReturn {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isPremium, setIsPremium] = useState(false);
  const [revenueCatReady, setRevenueCatReady] = useState(false);

  // Guard against double-configure calls across re-renders
  const configuredRef = useRef(false);
  // Hold the resolved plugin reference so we don't reload it on every call
  const pluginRef = useRef<PurchasesPlugin | null>(null);

  useEffect(() => {
    if (!user || configuredRef.current) {
      return;
    }

    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;
    if (!apiKey) {
      logger.error('[useRevenueCat] VITE_REVENUECAT_API_KEY is not set');
      return;
    }

    let cancelled = false;

    (async () => {
      const Purchases = await loadPlugin();
      if (!Purchases || cancelled) {
        // On web: mark ready so callers don't block forever
        if (!cancelled) {
          setRevenueCatReady(true);
        }
        return;
      }

      try {
        await Purchases.configure({
          apiKey,
          appUserID: user.id,
        });

        if (import.meta.env.DEV) {
          // Verbose logging only in development
          const { LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        }

        pluginRef.current = Purchases;
        configuredRef.current = true;

        // Immediately hydrate isPremium from stored CustomerInfo
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (!cancelled) {
          setIsPremium('pro' in (customerInfo.entitlements.active ?? {}));
          setRevenueCatReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error('[useRevenueCat] configure failed', { err });
          setRevenueCatReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const getOfferings = useCallback(async (): Promise<PurchasesOfferings | null> => {
    const Purchases = pluginRef.current;
    if (!Purchases) {
      logger.error('[useRevenueCat] getOfferings called before plugin is ready');
      return null;
    }
    try {
      const { offerings } = await Purchases.getOfferings();
      return offerings;
    } catch (err) {
      logger.error('[useRevenueCat] getOfferings failed', { err });
      return null;
    }
  }, []);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<void> => {
      const Purchases = pluginRef.current;
      if (!Purchases) {
        throw new Error('RevenueCat is not available on this platform.');
      }
      if (!user) {
        throw new Error('You must be signed in to upgrade.');
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      const isNowPremium = 'pro' in (customerInfo.entitlements.active ?? {});

      setIsPremium(isNowPremium);

      if (isNowPremium) {
        await syncPremiumToSupabase(user.id);
        toast({
          title: 'Welcome to Hisabify Pro!',
          description: 'Your subscription is now active.',
        });
      }
    },
    [user, toast],
  );

  const restorePurchases = useCallback(async (): Promise<void> => {
    const Purchases = pluginRef.current;
    if (!Purchases) {
      toast({
        title: 'Not available',
        description: 'Purchases can only be restored on the Android app.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      throw new Error('You must be signed in to restore purchases.');
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isNowPremium = 'pro' in (customerInfo.entitlements.active ?? {});
      setIsPremium(isNowPremium);

      if (isNowPremium) {
        await syncPremiumToSupabase(user.id);
        toast({
          title: 'Purchases restored',
          description: 'Your Pro subscription has been restored.',
        });
      } else {
        toast({
          title: 'No active subscription found',
          description: 'No previous Pro subscription was found for this account.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore purchases';
      logger.error('[useRevenueCat] restorePurchases failed', { err });
      toast({ title: 'Restore failed', description: message, variant: 'destructive' });
    }
  }, [user, toast]);

  return {
    isPremium,
    revenueCatReady,
    purchasePackage,
    getOfferings,
    restorePurchases,
  };
}
