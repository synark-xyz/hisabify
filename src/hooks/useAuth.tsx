import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { loginRateLimiter, isValidEmail, validatePasswordStrength, addAuthDelay } from '@/lib/security';
import { logger } from '@/lib/logger';
import { getEmailAuthRedirectUrl, getOAuthRedirectUrl } from '@/lib/authRedirect';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, privacyPolicyAccepted: boolean) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google') => Promise<{ error: Error | null }>;
  /** Resolves with `{ error }` — a non-null error means the user is STILL signed in. */
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('[Auth] onAuthStateChange', { event, hasSession: !!session, userId: session?.user?.id?.slice(0, 8) });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.info('[Auth] getSession result', { hasSession: !!session, userId: session?.user?.id?.slice(0, 8) });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, privacyPolicyAccepted: boolean) => {
    try {
      logger.info('[Auth] Starting sign up process', { email });
      
      // Validate email format
      if (!isValidEmail(email)) {
        logger.info('[Auth] Invalid email format', { email });
        return { error: new Error('Invalid email format') };
      }

      // Validate password strength
      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        logger.info('[Auth] Password validation failed', { email });
        return { error: new Error(passwordError) };
      }

      // Check rate limit
      if (!loginRateLimiter.isAllowed(`signup:${email}`)) {
        const resetTime = loginRateLimiter.getResetTime(`signup:${email}`);
        logger.info('[Auth] Sign up rate limit exceeded', { email, resetTime });
        logger.warn('Sign up rate limit exceeded', { email });
        return { 
          error: new Error(`Too many sign up attempts. Please try again in ${resetTime} seconds.`) 
        };
      }

      const redirectUrl = getEmailAuthRedirectUrl('/');
      logger.info('[Auth] Calling Supabase signUp', { email, redirectUrl });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            privacy_policy_accepted: privacyPolicyAccepted,
          },
        }
      });

      if (error) {
        logger.error(error, { action: 'signUp', email });
      } else {
        logger.info('User signed up successfully', { email });
        import('@/lib/analytics').then(({ analytics }) => analytics.trackAuth('sign_up', 'email')).catch(() => {});
        loginRateLimiter.reset(`signup:${email}`);
      }

      await addAuthDelay();
      return { error };
    } catch (error) {
      logger.error(error, { action: 'signUp' });
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      logger.info('[Auth] Starting sign in', { email });

      // Validate email format
      if (!isValidEmail(email)) {
        logger.info('[Auth] Invalid email format', { email });
        return { error: new Error('Invalid email format') };
      }

      // Check rate limit
      if (!loginRateLimiter.isAllowed(`signin:${email}`)) {
        const resetTime = loginRateLimiter.getResetTime(`signin:${email}`);
        logger.warn('Sign in rate limit exceeded', { email, resetTime });
        return { 
          error: new Error(`Too many login attempts. Please try again in ${resetTime} seconds.`) 
        };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        logger.error(error, { action: 'signIn', email });
      } else {
        logger.info('User signed in successfully', { email });
        import('@/lib/analytics').then(({ analytics }) => analytics.trackAuth('login', 'email')).catch(() => {});
        loginRateLimiter.reset(`signin:${email}`);
      }

      await addAuthDelay();
      return { error };
    } catch (error) {
      logger.error(error, { action: 'signIn' });
      return { error: error as Error };
    }
  };

  const signInWithOAuth = async (provider: 'google') => {
    try {
      const redirectTo = getOAuthRedirectUrl();
      logger.info('[OAuth] Starting flow', { provider, redirectTo });

      const isNative = Capacitor.isNativePlatform();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
        },
      });

      if (error) {
        logger.error(error, { action: 'signInWithOAuth', provider });
      } else {
        logger.info('[OAuth] signInWithOAuth returned', { provider, url: data?.url ? 'present' : 'missing' });
        import('@/lib/analytics').then(({ analytics }) => analytics.trackAuth('login', provider)).catch(() => {});

        if (isNative && data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
        }
      }
      return { error };
    } catch (error) {
      logger.error(error, { action: 'signInWithOAuth' });
      return { error: error as Error };
    }
  };

  /**
   * Signs the user out, and reports whether it actually worked.
   *
   * Two things make the naive version fail silently:
   *
   * 1. `supabase.auth.signOut()` *returns* `{ error }` rather than throwing, so a
   *    `try/catch` around it catches nothing and every failure looks like success.
   * 2. On a network error the server-side revoke fails and gotrue returns **before**
   *    `_removeSession()` — the local session survives, so the app is still signed in
   *    even though the UI said otherwise.
   *
   * So: check the returned error, and on failure fall back to `scope: 'local'`, which skips
   * the network entirely and just clears local storage. Signing out on this device must not
   * depend on being online — the user asked to leave, and stranding them in a signed-in app
   * is the one outcome that is never acceptable.
   */
  const signOut = async (): Promise<{ error: Error | null }> => {
    let failure: Error | null = null;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        failure = error;
        logger.warn('[Auth] Global sign out failed, falling back to local', {
          error: error.message,
        });
      }
    } catch (error) {
      failure = error as Error;
      logger.warn('[Auth] Global sign out threw, falling back to local', {
        error: String(error),
      });
    }

    if (failure) {
      // Local scope clears the stored session without contacting the server.
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
          logger.error(error, { action: 'signOut:local' });
          return { error };
        }
        failure = null;
      } catch (error) {
        logger.error(error, { action: 'signOut:local' });
        return { error: error as Error };
      }
    }

    // Belt and braces: if the session somehow survived both attempts, the user is still
    // signed in and must be told rather than shown a success toast.
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const error = new Error('Session persisted after sign out');
      logger.error(error, { action: 'signOut:verify' });
      return { error };
    }

    logger.info('User signed out successfully');
    setSession(null);
    setUser(null);

    import('@/lib/analytics')
      .then(({ analytics }) => {
        analytics.trackAuth('logout');
        analytics.clearUser();
      })
      .catch(() => {});

    // Fire-and-forget: reset the RevenueCat identity so the next account on this device
    // does not inherit this user's entitlements. Must never block or throw out of signOut.
    if (Capacitor.isNativePlatform()) {
      import('@revenuecat/purchases-capacitor')
        .then(({ Purchases }) => Purchases.logOut())
        .catch((error) => logger.warn('[Auth] RevenueCat logOut failed', { error: String(error) }));
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithOAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
