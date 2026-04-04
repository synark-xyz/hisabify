import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityLog, ActivityType, EntityType } from '@/types';
import type { Json } from '@/integrations/supabase/types';

export interface LogActivityInput {
  activity_type: ActivityType;
  entity_type: EntityType;
  entity_id: string;
  description: string;
  amount?: number | null;
  currency?: string;
  metadata?: Json;
  group_id?: string | null;
}

export function useActivityLog() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchActivities = useCallback(async (limit = 50) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivities((data as ActivityLog[]) || []);
    } catch (err) {
      console.error('[useActivityLog] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const logActivity = useCallback(async (input: LogActivityInput) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type: input.activity_type,
          entity_type: input.entity_type,
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
      setActivities((prev) => [(data as ActivityLog), ...prev]);
      return data as ActivityLog;
    } catch (err) {
      console.error('[useActivityLog] logActivity error:', err);
      return null;
    }
  }, [user]);

  return {
    activities,
    loading,
    logActivity,
    refetch: fetchActivities,
  };
}