import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

const SESSION_KEY = 'hisabify_session_id';
const ROUTE_TO_SCREEN: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/insights': 'Insights',
  '/analytics': 'Insights',
  '/budget': 'Budget',
  '/savings': 'Budget',
  '/reports': 'Insights',
  '/profile': 'Profile',
  '/profile/personal': 'Profile_Personal',
  '/profile/data': 'Profile_Data',
  '/profile/invite': 'Referrals',
  '/settings': 'Settings',
  '/settings/preferences': 'Preferences',
  '/settings/notifications': 'Notification_Settings',
  '/notifications': 'Notifications',
  '/auth': 'Auth',
  '/support': 'Support',
  '/faq': 'FAQ',
};

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
  if (Capacitor.isNativePlatform()) return Capacitor.getPlatform();
  return 'web';
}

export type { AnalyticsEvents };

/**
 * Consolidated analytics hook — dispatches to Firebase Analytics (screen views),
 * Supabase activity_log (DB writes), and in-memory session scoring.
 *
 * Replaces: useScreenTracking, useActivityLog, useUserBehavior.
 */
export function useAnalytics() {
  const { pathname } = useLocation();
  const prevPathRef = useRef<string>('');

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    const screenName = ROUTE_TO_SCREEN[pathname] || pathname;
    analytics.logScreenView(screenName).catch(() => {});
  }, [pathname]);

  const logActivity = useCallback(async (input: {
    activity_type: string;
    entity_type: string;
    entity_id: string;
    description: string;
    amount?: number | null;
    currency?: string;
    metadata?: Record<string, unknown>;
    group_id?: string | null;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type: input.activity_type as never,
          entity_type: input.entity_type as never,
          entity_id: input.entity_id,
          description: input.description,
          amount: input.amount ?? null,
          currency: input.currency ?? 'USD',
          metadata: input.metadata ?? {},
          group_id: input.group_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[useAnalytics] logActivity error:', err);
      return null;
    }
  }, []);

  const logEvent = useCallback(async (
    eventType: string,
    payload: Record<string, unknown> = {}
  ) => {
    analytics.logEvent(eventType, payload as Record<string, string | number | boolean>).catch(() => {});
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
      console.error('[useAnalytics] logEvent error:', err);
    }
  }, []);

  return { logActivity, logEvent };
}