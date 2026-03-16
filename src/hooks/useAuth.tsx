import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { loginRateLimiter, isValidEmail, validatePasswordStrength, addAuthDelay } from '@/lib/security';
import { logger } from '@/lib/logger';

/** Build the correct OAuth redirect URL for web and native platforms. */
function getOAuthRedirectUrl(): string {
  // For native platforms, we use a custom URL scheme that Capacitor intercepts.
  // The scheme matches the app ID: io.synark.hisabify://auth/callback
  // This allows the system browser to open for OAuth and then redirect back to our app.
  if (Capacitor.isNativePlatform()) {
    return 'io.synark.hisabify://auth/callback';
  }
  return `${window.location.origin}/auth/callback`;
}

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
      console.log('[Auth] Starting sign up process', { email });
      
      // Validate email format
      if (!isValidEmail(email)) {
        console.log('[Auth] Invalid email format', { email });
        return { error: new Error('Invalid email format') };
      }

      // Validate password strength
      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        console.log('[Auth] Password validation failed', { email, passwordError });
        return { error: new Error(passwordError) };
      }

      // Check rate limit
      if (!loginRateLimiter.isAllowed(`signup:${email}`)) {
        const resetTime = loginRateLimiter.getResetTime(`signup:${email}`);
        console.log('[Auth] Sign up rate limit exceeded', { email, resetTime });
        logger.warn('Sign up rate limit exceeded', { email });
        return { 
          error: new Error(`Too many sign up attempts. Please try again in ${resetTime} seconds.`) 
        };
      }

      const redirectUrl = `${window.location.origin}/`;
      console.log('[Auth] Calling Supabase signUp', { email, redirectUrl });
      
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
        console.error('[Auth] Sign up failed', { email, error: error.message });
        logger.error(error, { action: 'signUp', email });
      } else {
        console.log('[Auth] User signed up successfully', { email });
        logger.info('User signed up successfully', { email });
        loginRateLimiter.reset(`signup:${email}`);
      }

      await addAuthDelay();
      console.log('[Auth] Sign up process completed', { email, hasError: !!error });
      return { error };
    } catch (error) {
      console.error('[Auth] Sign up exception', { email, error });
      logger.error(error, { action: 'signUp' });
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting sign in process', { email });
      
      // Validate email format
      if (!isValidEmail(email)) {
        console.log('[Auth] Invalid email format', { email });
        return { error: new Error('Invalid email format') };
      }

      // Check rate limit
      if (!loginRateLimiter.isAllowed(`signin:${email}`)) {
        const resetTime = loginRateLimiter.getResetTime(`signin:${email}`);
        console.log('[Auth] Sign in rate limit exceeded', { email, resetTime });
        logger.warn('Sign in rate limit exceeded', { email });
        return { 
          error: new Error(`Too many login attempts. Please try again in ${resetTime} seconds.`) 
        };
      }

      console.log('[Auth] Calling Supabase signInWithPassword', { email });
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[Auth] Sign in failed', { email, error: error.message });
        logger.error(error, { action: 'signIn', email });
      } else {
        console.log('[Auth] User signed in successfully', { email });
        logger.info('User signed in successfully', { email });
        loginRateLimiter.reset(`signin:${email}`);
      }

      await addAuthDelay();
      console.log('[Auth] Sign in process completed', { email, hasError: !!error });
      return { error };
    } catch (error) {
      console.error('[Auth] Sign in exception', { email, error });
      logger.error(error, { action: 'signIn' });
      return { error: error as Error };
    }
  };

  const signInWithOAuth = async (provider: 'google') => {
    try {
      const redirectTo = getOAuthRedirectUrl();
      console.log('[OAuth] Starting flow', { provider, redirectTo, isNative: Capacitor.isNativePlatform() });
      logger.info('[OAuth] Starting flow', { provider, redirectTo, isNative: Capacitor.isNativePlatform() });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('[OAuth] Failed', { provider, error: error.message });
        logger.error(error, { action: 'signInWithOAuth', provider });
      } else {
        console.log('[OAuth] Success', { provider, url: data?.url ? 'present' : 'missing' });
        logger.info('[OAuth] signInWithOAuth returned', { provider, url: data?.url ? 'present' : 'missing' });
      }
      return { error };
    } catch (error) {
      console.error('[OAuth] Exception', { provider, error });
      logger.error(error, { action: 'signInWithOAuth' });
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      logger.info('User signed out successfully');
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
