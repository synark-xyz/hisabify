import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useRevenueCat, type PlanType } from './useRevenueCat';

export function useSubscription() {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const {
    getOfferings,
    purchasePlan: rcPurchasePlan,
    purchasePackage,
    restorePurchases,
    isEntitled,
    revenueCatReady,
    presentCustomerCenter,
    refreshCustomerInfo,
    presentPaywall: rcPresentPaywall,
  } = useRevenueCat();

  // Time-based referral Pro access check
  const hasActiveReferralGrant = profile.referral_granted_until
    ? new Date(profile.referral_granted_until) > new Date()
    : false;

  // PRO restrictions removed — entire app is now unlocked for all users.
  const isPremium = true;

  /**
   * Purchase a plan by type. On native, delegates to RevenueCat.
   * Supported plans: monthly | yearly
   */
  const purchasePlan = useCallback(
    async (plan: PlanType): Promise<void> => {
      if (!user) throw new Error('You must be signed in to upgrade.');
      await rcPurchasePlan(plan);
    },
    [user, rcPurchasePlan],
  );

  /**
   * Present the RevenueCat Customer Center (native only).
   * Allows users to manage/cancel their subscription without contacting support.
   */
  const showCustomerCenter = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    await presentCustomerCenter();
  }, [presentCustomerCenter]);

  const showPaywall = useCallback(async (): Promise<void> => {
    await rcPresentPaywall();
  }, [rcPresentPaywall]);

  // Backward-compatible alias
  const createCheckoutSession = purchasePlan;

  return {
    isPremium,
    loading,
    revenueCatReady,
    purchasePlan,
    createCheckoutSession,
    restorePurchases,
    getOfferings,
    purchasePackage,
    showCustomerCenter,
    showPaywall,
    refreshCustomerInfo,
  };
}
