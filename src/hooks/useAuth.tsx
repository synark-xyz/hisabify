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
  signOut: () => Promise<void>;
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      logger.info('User signed out successfully');
      import('@/lib/analytics').then(({ analytics }) => { analytics.trackAuth('logout'); analytics.clearUser(); }).catch(() => {});
    } catch (error) {
      logger.error(error, { action: 'signOut' });
    }
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
