import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

/**
 * Pure derivation of what to show on the Manage Subscription screen.
 *
 * Lives next to its hook the same way `ads.ts`, `theme.ts` and `ratingPrompt.ts` do, so the
 * branching can be unit-tested without a native bridge.
 */

export type SubscriptionTerm = 'monthly' | 'yearly' | 'lifetime' | 'unknown';

export type SubscriptionStatus =
  | { kind: 'free' }
  /** Pro granted by the time-boxed referral reward, not by a store purchase. */
  | { kind: 'referral'; until: Date }
  | {
      kind: 'pro';
      term: SubscriptionTerm;
      store: string;
      willRenew: boolean;
      expiresAt: Date | null;
      isTrial: boolean;
      hasBillingIssue: boolean;
      productIdentifier: string;
    }
  /** Web, or RevenueCat never resolved — no live entitlement data to show. */
  | { kind: 'unavailable' };

interface DeriveInput {
  customerInfo: CustomerInfo | null;
  referralGrantedUntil: string | null | undefined;
  entitlementId: string;
  isNative: boolean;
  now?: Date;
}

/** `expirationDate` is null for lifetime; otherwise the product id is the only term hint RC gives. */
function resolveTerm(productIdentifier: string, expiresAt: Date | null): SubscriptionTerm {
  if (!expiresAt) return 'lifetime';
  const id = productIdentifier.toLowerCase();
  if (id.includes('year') || id.includes('annual')) return 'yearly';
  if (id.includes('month')) return 'monthly';
  return 'unknown';
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function deriveSubscriptionStatus({
  customerInfo,
  referralGrantedUntil,
  entitlementId,
  isNative,
  now = new Date(),
}: DeriveInput): SubscriptionStatus {
  // The referral grant comes from Supabase, so it is knowable even where RevenueCat is not.
  const grantUntil = parseDate(referralGrantedUntil);
  const hasLiveGrant = grantUntil !== null && grantUntil > now;

  const entitlement = customerInfo?.entitlements.active?.[entitlementId];
  if (entitlement) {
    const expiresAt = parseDate(entitlement.expirationDate);
    return {
      kind: 'pro',
      term: resolveTerm(entitlement.productIdentifier, expiresAt),
      store: entitlement.store,
      willRenew: entitlement.willRenew,
      expiresAt,
      isTrial: entitlement.periodType === 'TRIAL',
      hasBillingIssue: Boolean(entitlement.billingIssueDetectedAt),
      productIdentifier: entitlement.productIdentifier,
    };
  }

  if (hasLiveGrant) return { kind: 'referral', until: grantUntil };

  // No entitlement and no grant: on web that means "we can't tell", not "you're on free".
  if (!isNative || !customerInfo) return { kind: 'unavailable' };

  return { kind: 'free' };
}
