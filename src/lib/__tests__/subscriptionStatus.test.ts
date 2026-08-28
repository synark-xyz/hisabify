import { describe, it, expect } from 'vitest';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { deriveSubscriptionStatus } from '../subscriptionStatus';

const ENTITLEMENT = 'hisabify-pro';
const NOW = new Date('2026-08-28T00:00:00Z');

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    identifier: ENTITLEMENT,
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    expirationDate: '2026-09-28T00:00:00Z',
    store: 'PLAY_STORE',
    productIdentifier: 'hisabify_pro_yearly',
    billingIssueDetectedAt: null,
    ...overrides,
  };
}

function info(active: Record<string, unknown>): CustomerInfo {
  return { entitlements: { active, all: active } } as unknown as CustomerInfo;
}

const base = { referralGrantedUntil: null, entitlementId: ENTITLEMENT, isNative: true, now: NOW };

describe('deriveSubscriptionStatus', () => {
  it('reports an auto-renewing subscription', () => {
    const status = deriveSubscriptionStatus({ ...base, customerInfo: info({ [ENTITLEMENT]: entitlement() }) });
    expect(status).toMatchObject({
      kind: 'pro', term: 'yearly', willRenew: true, store: 'PLAY_STORE', isTrial: false, hasBillingIssue: false,
    });
    expect(status.kind === 'pro' && status.expiresAt?.toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('reports a cancelled-but-not-yet-expired subscription as still Pro that will not renew', () => {
    const status = deriveSubscriptionStatus({
      ...base,
      customerInfo: info({ [ENTITLEMENT]: entitlement({ willRenew: false, productIdentifier: 'hisabify_pro_monthly' }) }),
    });
    expect(status).toMatchObject({ kind: 'pro', term: 'monthly', willRenew: false });
  });

  it('treats a null expiration as lifetime rather than an invalid date', () => {
    const status = deriveSubscriptionStatus({
      ...base,
      customerInfo: info({ [ENTITLEMENT]: entitlement({ expirationDate: null, productIdentifier: 'hisabify_pro_lifetime' }) }),
    });
    expect(status).toMatchObject({ kind: 'pro', term: 'lifetime', expiresAt: null });
  });

  it('surfaces trial and billing-issue flags', () => {
    const status = deriveSubscriptionStatus({
      ...base,
      customerInfo: info({ [ENTITLEMENT]: entitlement({ periodType: 'TRIAL', billingIssueDetectedAt: '2026-08-20T00:00:00Z' }) }),
    });
    expect(status).toMatchObject({ kind: 'pro', isTrial: true, hasBillingIssue: true });
  });

  it('does not read an entitlement stored under a different identifier as Pro', () => {
    const status = deriveSubscriptionStatus({
      ...base,
      customerInfo: info({ 'Hisabify Pro': entitlement({ identifier: 'Hisabify Pro' }) }),
    });
    expect(status.kind).toBe('free');
  });

  it('falls back to a live referral grant when there is no entitlement', () => {
    const status = deriveSubscriptionStatus({
      ...base,
      customerInfo: info({}),
      referralGrantedUntil: '2026-09-01T00:00:00Z',
    });
    expect(status).toMatchObject({ kind: 'referral' });
  });

  it('ignores an expired referral grant', () => {
    const status = deriveSubscriptionStatus({
      ...base,
      customerInfo: info({}),
      referralGrantedUntil: '2026-08-01T00:00:00Z',
    });
    expect(status.kind).toBe('free');
  });

  it('reports unavailable on web instead of claiming the user is on free', () => {
    expect(deriveSubscriptionStatus({ ...base, customerInfo: null, isNative: false }).kind).toBe('unavailable');
  });

  it('still reports a referral grant on web, since it comes from Supabase', () => {
    const status = deriveSubscriptionStatus({
      ...base, customerInfo: null, isNative: false, referralGrantedUntil: '2026-09-01T00:00:00Z',
    });
    expect(status).toMatchObject({ kind: 'referral' });
  });
});
