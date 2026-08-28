import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * Regression cover for sign out.
 *
 * The bug: `supabase.auth.signOut()` *returns* `{ error }` instead of throwing, so the old
 * `try/catch` caught nothing. Worse, gotrue's `_signOut` bails out before `_removeSession()`
 * when the server call fails, so the local session survived — the app showed "Signed out
 * successfully", navigated to /auth, and the user was still signed in.
 */

type SignOutResult = { error: { message: string } | null };

const state: {
  session: { user: { id: string } } | null;
  globalResult: SignOutResult | (() => never);
  localResult: SignOutResult;
  localCalls: number;
} = {
  session: { user: { id: 'u1' } },
  globalResult: { error: null },
  localResult: { error: null },
  localCalls: 0,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: state.session } }),
      signOut: async (opts?: { scope?: string }) => {
        if (opts?.scope === 'local') {
          state.localCalls += 1;
          if (!state.localResult.error) state.session = null;
          return state.localResult;
        }
        if (typeof state.globalResult === 'function') state.globalResult();
        const result = state.globalResult as SignOutResult;
        if (!result.error) state.session = null;
        return result;
      },
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));

vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }));

import { AuthProvider, useAuth } from '@/hooks/useAuth';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

async function mountAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
}

describe('signOut', () => {
  beforeEach(() => {
    state.session = { user: { id: 'u1' } };
    state.globalResult = { error: null };
    state.localResult = { error: null };
    state.localCalls = 0;
  });

  it('reports success and clears the user on a clean sign out', async () => {
    const result = await mountAuth();
    expect(result.current.user).not.toBeNull();

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome?.error).toBeNull();
    expect(state.session).toBeNull();
    await waitFor(() => expect(result.current.user).toBeNull());
  });

  it('falls back to a local sign out when the server call fails', async () => {
    // The exact shape of the original bug: a network/server failure leaves the session behind.
    state.globalResult = { error: { message: 'Failed to fetch' } };

    const result = await mountAuth();
    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(state.localCalls).toBe(1);
    expect(outcome?.error).toBeNull();
    expect(state.session).toBeNull();
    await waitFor(() => expect(result.current.user).toBeNull());
  });

  it('falls back to local when the global call throws outright', async () => {
    state.globalResult = () => {
      throw new Error('network down');
    };

    const result = await mountAuth();
    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(state.localCalls).toBe(1);
    expect(outcome?.error).toBeNull();
    expect(state.session).toBeNull();
  });

  it('reports an error rather than claiming success when the session survives', async () => {
    // Both paths fail: the caller must NOT show a success toast and navigate away.
    state.globalResult = { error: { message: 'Failed to fetch' } };
    state.localResult = { error: { message: 'storage unavailable' } };

    const result = await mountAuth();
    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome?.error).toBeTruthy();
    expect(state.session).not.toBeNull();
  });

  it('reports an error if the session survives a "successful" sign out', async () => {
    const result = await mountAuth();

    // Storage that reports success but silently fails to persist the removal: both signOut
    // calls return `{ error: null }` while the session stays readable. Without the explicit
    // getSession() verification this is indistinguishable from a real sign out.
    state.globalResult = { error: null };
    state.localResult = { error: null };
    const stubborn = { user: { id: 'u1' } };
    state.session = stubborn;
    const restore = () => {
      state.session = stubborn;
    };

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      const p = result.current.signOut();
      restore();
      outcome = await p;
    });

    expect(outcome?.error).toBeTruthy();
    expect(outcome?.error?.message).toMatch(/persisted/i);
  });
});
