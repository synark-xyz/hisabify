import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCurrency } from './useCurrency';
import { useExchangeRate } from './useExchangeRate';
import { Transaction } from '@/types';
import { TransactionFilters, TransactionSort, defaultFilters, defaultSort } from '@/lib/transaction-schemas';
import { startOfMonth, endOfMonth } from 'date-fns';

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

interface UseTransactionsOptions {
  currentDate?: Date;
  enableRealtime?: boolean;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { currentDate = new Date(), enableRealtime = true } = options;
  const { user } = useAuth();
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const [transactions, setTransactions] = useState<ConvertedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [sort, setSort] = useState<TransactionSort>(defaultSort);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const start = filters.dateFrom 
        ? filters.dateFrom.toISOString() 
        : startOfMonth(currentDate).toISOString();
      const end = filters.dateTo 
        ? filters.dateTo.toISOString() 
        : endOfMonth(currentDate).toISOString();

      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      // Apply type filter
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      // Apply category filter
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      // Apply receipt filter
      if (filters.hasReceipt === true) {
        query = query.not('receipt_url', 'is', null);
      } else if (filters.hasReceipt === false) {
        query = query.is('receipt_url', null);
      }

      // Apply sorting
      query = query.order(sort.field === 'category' ? 'category_id' : sort.field, { 
        ascending: sort.direction === 'asc' 
      });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Convert amounts and apply search filter
        let processedData = await Promise.all(
          (data as unknown as Transaction[]).map(async (tx) => {
            const storedCurrency = tx.currency_base || 'USD';
            let convertedAmount = Number(tx.amount);
            
            if (storedCurrency !== currency) {
              const result = await convertAmount(Number(tx.amount), storedCurrency, currency);
              if (result) {
                convertedAmount = result.convertedAmount;
              }
            }
            
            return { ...tx, convertedAmount };
          })
        );

        // Apply search filter (client-side for flexibility)
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          processedData = processedData.filter(tx => 
            tx.merchant.toLowerCase().includes(searchLower) ||
            tx.category?.name?.toLowerCase().includes(searchLower) ||
            tx.note?.toLowerCase().includes(searchLower)
          );
        }

        // Apply amount sorting after conversion
        if (sort.field === 'amount') {
          processedData.sort((a, b) => {
            const diff = a.convertedAmount - b.convertedAmount;
            return sort.direction === 'asc' ? diff : -diff;
          });
        }

        setTransactions(processedData);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentDate, currency, currencyVersion, filters, sort, convertAmount]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !enableRealtime) return;

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any change
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enableRealtime, fetchTransactions]);

  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const updateSort = useCallback((newSort: Partial<TransactionSort>) => {
    setSort(prev => ({ ...prev, ...newSort }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSort(defaultSort);
  }, []);

  // Computed values
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  const incomeTransactions = transactions.filter(tx => tx.type === 'income');

  return {
    transactions,
    loading,
    filters,
    sort,
    updateFilters,
    updateSort,
    resetFilters,
    refetch: fetchTransactions,
    totalIncome,
    totalExpense,
    expenseTransactions,
    incomeTransactions,
  };
}
