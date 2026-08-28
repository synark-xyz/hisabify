import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { mergeActivityFeed, type FeedTransaction } from '@/lib/activityFeed';
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

export function useActivityHistory() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [transactions, setTransactions] = useState<FeedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const fetchActivities = useCallback(async (limit = 50) => {
    if (!user) return;
    setLoading(true);
    try {
      // activity_log only ever receives debt events today, so the feed would be
      // empty for anyone who has never used /debts. Transactions are the other
      // half of the feed — same as the Dashboard preview.
      const [activityRes, transactionRes] = await Promise.all([
        supabase
          .from('activity_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(limit),
      ]);

      if (activityRes.error) throw activityRes.error;
      if (transactionRes.error) throw transactionRes.error;

      setActivities((activityRes.data as ActivityLog[]) || []);

      // Convert at display time — transactions.amount_converted is frozen at the
      // base currency in force when the row was written.
      const converted = await Promise.all(
        (transactionRes.data || []).map(async (tx) => {
          const storedCurrency = tx.currency_base || 'USD';
          if (storedCurrency === currency) return { ...tx, convertedAmount: Number(tx.amount) };
          const result = await convertAmount(Number(tx.amount), storedCurrency, currency);
          return { ...tx, convertedAmount: result ? result.convertedAmount : Number(tx.amount) };
        }),
      );
      setTransactions(converted as unknown as FeedTransaction[]);
    } catch (err) {
      console.error('[useActivityHistory] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currency, convertAmount]);

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
      console.error('[useActivityHistory] logActivity error:', err);
      return null;
    }
  }, [user]);

  const feed = useMemo(
    () => mergeActivityFeed(activities, transactions),
    [activities, transactions],
  );

  return {
    activities,
    feed,
    loading,
    logActivity,
    refetch: fetchActivities,
  };
}