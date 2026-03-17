import { useCallback } from 'react';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useRevenueCat } from './useRevenueCat';
import { logger } from '@/lib/logger';

export function useSubscription() {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const { getOfferings, purchasePackage, restorePurchases } = useRevenueCat();

  // Hardcoded override for the owner account
  const isSpecialUser = user?.email === 'sam103043@gmail.com';

  // Time-based referral Pro access check
  const hasActiveReferralGrant = profile.referral_granted_until
    ? new Date(profile.referral_granted_until) > new Date()
    : false;

  /**
   * Initiates an in-app purchase via RevenueCat for the given plan.
   * Maps 'monthly' → MONTHLY package identifier, 'yearly' → ANNUAL.
   * Throws on failure so callers can surface errors via toast.
   */
  const purchasePlan = useCallback(
    async (plan: 'monthly' | 'yearly'): Promise<void> => {
      if (!user) {
        throw new Error('You must be signed in to upgrade.');
      }

      const offerings = await getOfferings();
      if (!offerings) {
        throw new Error('Could not load subscription plans. Please try again.');
      }

      const current = offerings.current;
      if (!current) {
        throw new Error('No active offering found. Please try again later.');
      }

      // RevenueCat package identifiers per the Play Store product configuration
      const packageIdentifier = plan === 'monthly' ? '$rc_monthly' : '$rc_annual';

      const pkg = current.availablePackages.find(
        (p) => p.packageType === (plan === 'monthly' ? 'MONTHLY' : 'ANNUAL'),
      ) ?? current.availablePackages.find(
        (p) => p.identifier === packageIdentifier,
      );

      if (!pkg) {
        logger.error('[useSubscription] purchasePlan: package not found', {
          plan,
          availablePackages: current.availablePackages.map((p) => ({
            id: p.identifier,
            type: p.packageType,
          })),
        });
        throw new Error(`The ${plan} plan is not available right now.`);
      }

      await purchasePackage(pkg);
    },
    [user, getOfferings, purchasePackage],
  );

  // Backward-compatible alias — UpgradeModal already calls this name.
  // New code should prefer purchasePlan directly.
  const createCheckoutSession = purchasePlan;

  return {
    isPremium: (
      (profile.subscription_type === 'pro' && profile.subscription_status === 'active') ||
      hasActiveReferralGrant ||
      isSpecialUser
    ),
    loading,
    purchasePlan,
    createCheckoutSession,
    restorePurchases,
  };
}
