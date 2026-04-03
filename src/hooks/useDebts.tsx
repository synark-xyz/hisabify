import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Debt } from '@/types';

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

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (err) {
      console.error('[useDebts] fetchDebts error:', err);
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
      return data as Debt;
    } catch (err) {
      setDebts((prev) => prev.filter((d) => d.id !== tempId));
      toast({ title: 'Error', description: 'Failed to add debt.', variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const settleDebt = useCallback(async ({ id, amount_paid }: SettleDebtInput) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;

    const clamped = Math.min(amount_paid, debt.amount);
    const newStatus: Debt['status'] =
      clamped >= debt.amount ? 'settled' : clamped > 0 ? 'partial' : 'outstanding';

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
    } catch {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, amount_paid: debt.amount_paid, status: debt.status } : d
        )
      );
      toast({ title: 'Error', description: 'Failed to update debt.', variant: 'destructive' });
    }
  }, [debts, toast]);

  const deleteDebt = useCallback(async (id: string) => {
    const prev = debts;
    setDebts((d) => d.filter((x) => x.id !== id));
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
    } catch {
      setDebts(prev);
      toast({ title: 'Error', description: 'Failed to delete debt.', variant: 'destructive' });
    }
  }, [debts, toast]);

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
