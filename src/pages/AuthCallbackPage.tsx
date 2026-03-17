import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

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

  useEffect(() => {
    let mounted = true;

    console.log('[OAuthCallback] Page mounted', {
      hash: window.location.hash ? 'present' : 'empty',
      search: window.location.search ? 'present' : 'empty',
      href: window.location.href.replace(/[?#].*/, '?[redacted]'),
    });

    // Primary mechanism: listen for auth state change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        console.log('[OAuthCallback] Auth state change', { event, hasSession: !!session });

        if (event === 'SIGNED_IN' && session) {
          console.log('[OAuthCallback] Sign-in confirmed, navigating to dashboard', {
            provider: session.user?.app_metadata?.provider,
            userId: session.user?.id?.slice(0, 8),
          });
          navigate('/', { replace: true });
        }
      },
    );

    // On native (Capacitor), detectSessionInUrl runs at client init time (https://localhost/),
    // so by the time React Router navigates here, Supabase has already missed the ?code param.
    // We must manually exchange it.
    const exchangeCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');

      if (errorParam) {
        console.error('[OAuthCallback] OAuth error from provider:', errorParam, params.get('error_description'));
        setError(`Sign-in failed: ${params.get('error_description') || errorParam}`);
        setTimeout(() => { if (mounted) navigate('/auth', { replace: true }); }, 2000);
        return;
      }

      if (code) {
        console.log('[OAuthCallback] Exchanging PKCE code for session');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[OAuthCallback] Exchange result', { hasSession: !!data?.session, error: exchangeError?.message });
        if (!mounted) return;
        if (exchangeError) {
          console.error('[OAuthCallback] Code exchange failed:', exchangeError.message);
          setError('Sign-in failed. Please try again.');
          setTimeout(() => { if (mounted) navigate('/auth', { replace: true }); }, 2000);
          return;
        }
        // onAuthStateChange SIGNED_IN will fire and navigate to dashboard
        return;
      }

      // No code param — check if a session already exists (e.g., re-visit)
      const { data } = await supabase.auth.getSession();
      console.log('[OAuthCallback] Fallback getSession check', { hasSession: !!data.session });
      if (data.session && mounted) {
        navigate('/', { replace: true });
      } else {
        console.warn('[OAuthCallback] No code or session found');
      }
    };

    exchangeCode();

    // Safety timeout — if nothing happens in 15s, redirect back to auth
    const safetyTimeout = setTimeout(() => {
      if (!mounted) return;
      console.warn('[OAuthCallback] Safety timeout reached (15s)');
      
      // Check one more time for session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session && mounted) {
          navigate('/', { replace: true });
        } else {
          setError('Sign-in timed out. Please try again.');
          setTimeout(() => { if (mounted) navigate('/auth', { replace: true }); }, 2000);
        }
      });
    }, 15000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
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
