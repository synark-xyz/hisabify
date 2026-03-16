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
    // Supabase automatically handles both PKCE (query params) and implicit (hash) flows.
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
        
        // Handle SIGN_OUT event too
        if (event === 'SIGNED_OUT') {
          console.log('[OAuthCallback] User signed out during callback');
        }
      },
    );

    // Fallback: check if there's already a session (e.g., PKCE code was processed
    // before this component mounted, or the user navigated here directly).
    const checkExistingSession = async () => {
      // Small delay to let Supabase's internal URL parsing run first
      await new Promise(r => setTimeout(r, 500));
      if (!mounted) return;

      const { data, error: sessionError } = await supabase.auth.getSession();
      console.log('[OAuthCallback] Fallback getSession check', {
        hasSession: !!data.session,
        error: sessionError?.message,
      });

      if (sessionError) {
        console.error('[OAuthCallback] Session error:', sessionError);
        // Don't set error immediately - might still get auth state change
        return;
      }

      if (data.session) {
        console.log('[OAuthCallback] Session found via fallback, navigating');
        navigate('/', { replace: true });
        return;
      }

      // Check if we have auth params (PKCE code or hash)
      const hasAuthParams = window.location.search.includes('code=') || 
                           window.location.search.includes('error=') ||
                           window.location.hash;
      
      if (!hasAuthParams) {
        // No auth params at all - might be a stale visit
        console.warn('[OAuthCallback] No auth params present');
      }
    };

    checkExistingSession();

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
