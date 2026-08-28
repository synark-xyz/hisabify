import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * Behavioural cover for the `public.users` subscription mirror.
 *
 * The bug this pins down: `syncPremiumToSupabase` only ever wrote `pro`/`active` and was only
 * called from the purchase/restore/paywall call sites. Expiry, refund and cancellation arrive
 * exclusively through `addCustomerInfoUpdateListener` and the app-foreground refresh, so the
 * row stayed `pro`/`active` forever once a subscription lapsed.
 *
 * These tests drive the hook through the real listener, not the purchase path, and assert on
 * the payloads actually handed to Supabase.
 */

const ENTITLEMENT_ID = 'hisabify-pro';

/** Every `.update()` payload sent to `public.users`, in order. */
const updates: Array<Record<string, unknown>> = [];

vi.mock('@/integrations/supabase/client', () => {
  const chain = (payload: Record<string, unknown>) => {
    const c: Record<string, unknown> = {};
    c.eq = () => c;
    c.select = () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null });
    c.then = (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: [{ user_id: 'u1' }], error: null }).then(res);
    void payload;
    return c;
  };
  return {
    supabase: {
      from: (table: string) => ({
        update: (payload: Record<string, unknown>) => {
          if (table === 'users') updates.push(payload);
          return chain(payload);
        },
      }),
    },
  };
});

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(async () => ({ remove: vi.fn() })) },
}));

/** Pushes a fresh CustomerInfo at the hook, exactly as RevenueCat does on renewal/expiry. */
let emitCustomerInfo: (entitled: boolean) => void = () => {};

const info = (entitled: boolean) =>
  ({ entitlements: { active: entitled ? { [ENTITLEMENT_ID]: {} } : {} } }) as never;

vi.mock('@revenuecat/purchases-capacitor', () => {
  const Purchases = {
    isConfigured: async () => ({ isConfigured: true }),
    logIn: async () => ({}),
    configure: async () => ({}),
    // `import.meta.env.DEV` is true under vitest, so the hook calls this during init.
    setLogLevel: async () => ({}),
    getCustomerInfo: async () => ({ customerInfo: info(false) }),
    addCustomerInfoUpdateListener: async (cb: (i: unknown) => void) => {
      emitCustomerInfo = (entitled: boolean) => cb(info(entitled));
      return 'listener-1';
    },
    removeCustomerInfoUpdateListener: async () => ({}),
  };
  return { Purchases, LOG_LEVEL: { DEBUG: 'DEBUG' } };
});

vi.mock('@revenuecat/purchases-capacitor-ui', () => ({ RevenueCatUI: {} }));

import { useRevenueCat } from '@/hooks/useRevenueCat';

describe('useRevenueCat → public.users mirror', () => {
  beforeEach(() => {
    updates.length = 0;
  });

  it('writes pro/active on upgrade and base/inactive on expiry', async () => {
    const { result } = renderHook(() => useRevenueCat());
    await waitFor(() => expect(result.current.revenueCatReady).toBe(true));

    // Initial resolve is "not entitled" — the mirror is written once, downwards.
    await waitFor(() => expect(updates.length).toBe(1));
    expect(updates[0]).toMatchObject({ subscription_type: 'base', subscription_status: 'inactive' });

    // Purchase lands through the customer-info listener.
    await act(async () => {
      emitCustomerInfo(true);
    });
    await waitFor(() => expect(result.current.isPremium).toBe(true));
    expect(updates.at(-1)).toMatchObject({ subscription_type: 'pro', subscription_status: 'active' });

    // The case the old code missed entirely: the sandbox subscription expires.
    await act(async () => {
      emitCustomerInfo(false);
    });
    await waitFor(() => expect(result.current.isPremium).toBe(false));
    expect(updates.at(-1)).toMatchObject({
      subscription_type: 'base',
      subscription_status: 'inactive',
    });
  });

  it('never writes subscription_type outside the DB CHECK (base|pro)', async () => {
    const { result } = renderHook(() => useRevenueCat());
    await waitFor(() => expect(result.current.revenueCatReady).toBe(true));

    await act(async () => {
      emitCustomerInfo(true);
    });
    await act(async () => {
      emitCustomerInfo(false);
    });

    await waitFor(() => expect(updates.length).toBeGreaterThan(1));
    for (const u of updates) {
      // 'free' would be silently rejected by the column's CHECK constraint.
      expect(['base', 'pro']).toContain(u.subscription_type);
    }
  });

  it('does not re-write the row when the entitlement has not changed', async () => {
    const { result } = renderHook(() => useRevenueCat());
    await waitFor(() => expect(result.current.revenueCatReady).toBe(true));

    await act(async () => {
      emitCustomerInfo(true);
    });
    await waitFor(() => expect(result.current.isPremium).toBe(true));
    const afterUpgrade = updates.length;

    // Every foreground refresh and renewal ping re-emits the same state.
    await act(async () => {
      emitCustomerInfo(true);
      emitCustomerInfo(true);
    });
    expect(updates.length).toBe(afterUpgrade);
  });
});
