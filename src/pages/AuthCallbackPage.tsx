import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  getAuthProviderErrorMessage,
  isDuplicateAuthCodeExchangeError,
  parseAuthCallbackParams,
} from '@/lib/authRedirect';

/**
 * OAuth callback handler.
 *
 * After Google authenticates the user, Supabase redirects back with either:
 * - PKCE flow: auth code in query params (?code=...)
 * - Implicit flow: tokens in hash fragment (#access_token=...)
 * 
 * This page listens for the SIGNED_IN auth state change, then navigates to the dashboard.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const timeoutIds: number[] = [];

    const completeSuccess = (context: string) => {
      if (!mounted || settledRef.current) return;

      settledRef.current = true;
      console.log('[OAuthCallback] Sign-in completed, navigating to dashboard', { context });
      navigate('/', { replace: true });
    };

    const completeFailure = (message: string) => {
      if (!mounted || settledRef.current) return;

      settledRef.current = true;
      setError(message);
      timeoutIds.push(window.setTimeout(() => {
        if (mounted) {
          navigate('/auth', { replace: true });
        }
      }, 2000));
    };

    console.log('[OAuthCallback] Page mounted', {
      hash: window.location.hash ? 'present' : 'empty',
      search: window.location.search ? 'present' : 'empty',
      href: window.location.href.replace(/[?#].*/, '?[redacted]'),
    });

    // Primary mechanism: listen for auth state change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted || settledRef.current) return;
        console.log('[OAuthCallback] Auth state change', { event, hasSession: !!session });

        if (event === 'SIGNED_IN' && session) {
          console.log('[OAuthCallback] Sign-in confirmed, navigating to dashboard', {
            provider: session.user?.app_metadata?.provider,
            userId: session.user?.id?.slice(0, 8),
          });
          completeSuccess('auth-state-change');
        }
      },
    );

    // On native (Capacitor), detectSessionInUrl runs at client init time (https://localhost/),
    // so by the time React Router navigates here, Supabase has already missed the ?code param.
    // We must manually exchange it.
    const exchangeCode = async () => {
      const { code, error: providerError, errorDescription } = parseAuthCallbackParams(window.location.search);
      const providerErrorMessage = getAuthProviderErrorMessage({
        error: providerError,
        errorDescription,
      });

      if (providerErrorMessage) {
        console.error('[OAuthCallback] OAuth error from provider:', providerError, errorDescription);
        completeFailure(providerErrorMessage);
        return;
      }

      if (code) {
        console.log('[OAuthCallback] Exchanging PKCE code for session');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[OAuthCallback] Exchange result', { hasSession: !!data?.session, error: exchangeError?.message });
        if (!mounted || settledRef.current) return;

        if (exchangeError) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            logger.warn('[OAuthCallback] Exchange failed but session already exists', {
              message: exchangeError.message,
            });
            completeSuccess('existing-session-after-exchange-error');
            return;
          }

          console.error('[OAuthCallback] Code exchange failed:', exchangeError.message);
          completeFailure(
            isDuplicateAuthCodeExchangeError(exchangeError.message)
              ? 'This sign-in link has already been used. Please try signing in again.'
              : 'Sign-in failed. Please try again.',
          );
          return;
        }

        if (data.session) {
          completeSuccess('exchange-returned-session');
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          completeSuccess('session-available-after-exchange');
          return;
        }

        completeFailure('Sign-in did not complete. Please try again.');
        return;
      }

      // No code param — check if a session already exists (e.g., re-visit)
      const { data } = await supabase.auth.getSession();
      console.log('[OAuthCallback] Fallback getSession check', { hasSession: !!data.session });
      if (data.session) {
        completeSuccess('fallback-existing-session');
      } else {
        console.warn('[OAuthCallback] No code or session found');
      }
    };

    exchangeCode();

    // Safety timeout — if nothing happens in 15s, redirect back to auth
    const safetyTimeout = setTimeout(() => {
      if (!mounted || settledRef.current) return;
      console.warn('[OAuthCallback] Safety timeout reached (15s)');
      
      // Check one more time for session
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted || settledRef.current) return;

        if (data.session) {
          completeSuccess('safety-timeout-session');
        } else if (parseAuthCallbackParams(window.location.search).code) {
          completeFailure('Sign-in timed out. Please try again.');
        } else {
          completeFailure('Sign-in did not complete. Please try again.');
        }
      });
    }, 15000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      {error ? (
        <>
          <div className="text-destructive text-sm text-center max-w-xs">{error}</div>
          <p className="text-muted-foreground text-xs">Redirecting to sign in...</p>
        </>
      ) : (
        <>
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Completing sign in...</p>
        </>
      )}
    </div>
  );
}
