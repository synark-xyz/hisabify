import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Debt } from '@/types';
import { logger } from '@/lib/logger';

export interface CreateDebtInput {
  person_name: string;
  amount: number;
  currency: string;
  type: 'i_owe' | 'they_owe';
  due_date?: string | null;
  notes?: string | null;
}

export interface SettleDebtInput {
  id: string;
  amount_paid: number;
}

export interface UseDebtsOptions {
  onActivityLog?: (input: {
    activity_type: 'debt_created' | 'debt_settled' | 'debt_updated' | 'debt_deleted';
    entity_type: 'debt';
    entity_id: string;
    description: string;
    amount?: number;
    currency?: string;
    group_id?: string;
  }) => void;
}

export function useDebts(options?: UseDebtsOptions) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isFetchingRef = useRef(false);

  const fetchDebts = useCallback(async () => {
    if (!user || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDebts((data as Debt[]) || []);
      setError(null);
    } catch (err) {
      // Was swallowed with a console.error, which rendered a fetch failure as the
      // "No debts tracked" empty state — indistinguishable from a clean account.
      logger.error(err, { component: 'useDebts', action: 'fetchDebts' });
      setError(err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('debts-changes')
      .on('postgres_changes', { event: '*', table: 'debts', filter: `user_id=eq.${user.id}` }, () => {
        fetchDebts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchDebts]);

  const createDebt = useCallback(async (input: CreateDebtInput) => {
    if (!user) return null;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Debt = {
      id: tempId,
      user_id: user.id,
      person_name: input.person_name,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      due_date: input.due_date ?? null,
      status: 'outstanding',
      amount_paid: 0,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDebts((prev) => [optimistic, ...prev]);

    try {
      const { data, error } = await supabase
        .from('debts')
        .insert({
          user_id: user.id,
          person_name: input.person_name,
          amount: input.amount,
          currency: input.currency,
          type: input.type,
          due_date: input.due_date ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      setDebts((prev) => prev.map((d) => (d.id === tempId ? (data as Debt) : d)));
      
      options?.onActivityLog?.({
        activity_type: 'debt_created',
        entity_type: 'debt',
        entity_id: data.id,
        description: input.type === 'i_owe'
          ? `youOwe|${input.person_name}|${input.currency}|${input.amount.toFixed(2)}`
          : `owesYou|${input.person_name}|${input.currency}|${input.amount.toFixed(2)}`,
        amount: input.amount,
        currency: input.currency,
      });
      
      return data as Debt;
    } catch (err) {
      setDebts((prev) => prev.filter((d) => d.id !== tempId));
      toast({ title: 'Error', description: 'Failed to add debt.', variant: 'destructive' });
      return null;
    }
  }, [user, toast, options]);

  const settleDebt = useCallback(async ({ id, amount_paid }: SettleDebtInput) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;

    const clamped = Math.min(amount_paid, debt.amount);
    const newStatus: Debt['status'] =
      clamped >= debt.amount ? 'settled' : clamped > 0 ? 'partial' : 'outstanding';
    const paidAmount = clamped - debt.amount_paid;

    setDebts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, amount_paid: clamped, status: newStatus } : d
      )
    );

    try {
      const { error } = await supabase
        .from('debts')
        .update({ amount_paid: clamped, status: newStatus })
        .eq('id', id);
      if (error) throw error;

      const isSettled = newStatus === 'settled';
      const settlementAmount = paidAmount > 0 ? paidAmount : amount_paid;
      
      options?.onActivityLog?.({
        activity_type: isSettled ? 'debt_settled' : 'debt_updated',
        entity_type: 'debt',
        entity_id: id,
        description: isSettled
          ? `${debt.type === 'i_owe' ? 'settledDebtTo' : 'settledDebtFrom'}|${debt.person_name}|${debt.currency}|${debt.amount.toFixed(2)}`
          : `paidTowards|${debt.person_name}|${debt.currency}|${settlementAmount.toFixed(2)}`,
        amount: settlementAmount,
        currency: debt.currency,
        group_id: id,
      });
    } catch {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, amount_paid: debt.amount_paid, status: debt.status } : d
        )
      );
      toast({ title: 'Error', description: 'Failed to update debt.', variant: 'destructive' });
    }
  }, [debts, toast, options]);

  const deleteDebt = useCallback(async (id: string) => {
    const debt = debts.find((d) => d.id === id);
    const prev = debts;
    setDebts((d) => d.filter((x) => x.id !== id));
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;

      if (debt) {
        options?.onActivityLog?.({
          activity_type: 'debt_deleted',
          entity_type: 'debt',
          entity_id: id,
          description: `${debt.type === 'i_owe' ? 'deletedDebtTo' : 'deletedDebtFrom'}|${debt.person_name}`,
          amount: debt.amount,
          currency: debt.currency,
        });
      }
    } catch {
      setDebts(prev);
      toast({ title: 'Error', description: 'Failed to delete debt.', variant: 'destructive' });
    }
  }, [debts, toast, options]);

  const updateDebt = useCallback(async (id: string, updates: Partial<CreateDebtInput>) => {
    const prev = debts;
    setDebts((d) => d.map((x) => x.id === id ? { ...x, ...updates } : x));
    try {
      const { error } = await supabase.from('debts').update(updates).eq('id', id);
      if (error) throw error;
    } catch {
      setDebts(prev);
      toast({ title: 'Error', description: 'Failed to update debt.', variant: 'destructive' });
    }
  }, [debts, toast]);

  const outstandingDebts = debts.filter((d) => d.status !== 'settled');
  const iOwe = outstandingDebts.filter((d) => d.type === 'i_owe');
  const theyOwe = outstandingDebts.filter((d) => d.type === 'they_owe');
  const totalIOwe = iOwe.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0);
  const totalTheyOwe = theyOwe.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0);

  return {
    debts,
    loading,
    error,
    outstandingDebts,
    iOwe,
    theyOwe,
    totalIOwe,
    totalTheyOwe,
    createDebt,
    settleDebt,
    deleteDebt,
    updateDebt,
    refetch: fetchDebts,
  };
}
