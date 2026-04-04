import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

const SESSION_KEY = 'hisabify_session_id';

function getOrCreateSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'web';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getPlatform(): string {
  if (typeof window === 'undefined') return 'web';
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform();
  }
  return 'web';
}

interface LogEventOptions {
  userId?: string;
}

/**
 * Thin hook for logging user behavior events to user_behavior_events table.
 *
 * Automatically attaches:
 * - session_id: tab-scoped UUID from sessionStorage
 * - platform: 'web' | 'android' | 'ios'
 *
 * @example
 * const { logEvent } = useUserBehavior();
 * await logEvent('transaction_created', { amount: 45.50, category: 'Food' });
 */
export function useUserBehavior() {
  const logEvent = useCallback(async (
    eventType: string,
    payload: Record<string, unknown>,
    _options?: LogEventOptions
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_behavior_events').insert({
        user_id: user.id,
        event_type: eventType,
        payload,
        session_id: getOrCreateSessionId(),
        platform: getPlatform(),
      });
    } catch (err) {
      // Non-critical — swallow errors to not affect UX
      console.error('[useUserBehavior] Failed to log event:', err);
    }
  }, []);

  return { logEvent };
}
