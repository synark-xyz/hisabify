import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { loginRateLimiter, isValidEmail, validatePasswordStrength, addAuthDelay } from '@/lib/security';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, privacyPolicyAccepted: boolean) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, privacyPolicyAccepted: boolean) => {
    try {
      // Validate email format
      if (!isValidEmail(email)) {
        return { error: new Error('Invalid email format') };
      }

      // Validate password strength
      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        return { error: new Error(passwordError) };
      }

      // Check rate limit
      if (!loginRateLimiter.isAllowed(`signup:${email}`)) {
        const resetTime = loginRateLimiter.getResetTime(`signup:${email}`);
        logger.warn('Sign up rate limit exceeded', { email });
        return { 
          error: new Error(`Too many sign up attempts. Please try again in ${resetTime} seconds.`) 
        };
      }

      const redirectUrl = `${window.location.origin}/`;
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
      // Validate email format
      if (!isValidEmail(email)) {
        return { error: new Error('Invalid email format') };
      }

      // Check rate limit
      if (!loginRateLimiter.isAllowed(`signin:${email}`)) {
        const resetTime = loginRateLimiter.getResetTime(`signin:${email}`);
        logger.warn('Sign in rate limit exceeded', { email });
        return { 
          error: new Error(`Too many login attempts. Please try again in ${resetTime} seconds.`) 
        };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        logger.error(error, { action: 'signIn', email });
      } else {
        logger.info('User signed in successfully', { email });
        loginRateLimiter.reset(`signin:${email}`);
      }

      await addAuthDelay();
      return { error };
    } catch (error) {
      logger.error(error, { action: 'signIn' });
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
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
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
