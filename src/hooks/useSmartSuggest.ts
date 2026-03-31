import { useMemo } from 'react';
import type { BudgetWithSpending } from '@/hooks/useBudgets';
import type { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';

type TransactionType = 'expense' | 'income' | 'lend' | 'owe';

export type SmartSuggestion =
  | { type: 'budget'; item: BudgetWithSpending }
  | { type: 'goal'; item: SavingsGoalWithProgress }
  | null;

export function useSmartSuggest(
  txType: TransactionType,
  categoryId: string | null,
  budgets: BudgetWithSpending[],
  goals: SavingsGoalWithProgress[]
): SmartSuggestion {
  return useMemo(() => {
    if (txType === 'expense') {
      const categoryMatch = budgets.find(
        b => b.category_id && b.category_id === categoryId && b.status !== 'exceeded'
      );
      if (categoryMatch) return { type: 'budget', item: categoryMatch };
      const fallback = budgets.find(b => b.status !== 'exceeded');
      return fallback ? { type: 'budget', item: fallback } : null;
    }

    if (txType === 'income') {
      const active = goals
        .filter(g => !g.isArchived && g.percentage < 100)
        .sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
      return active.length > 0 ? { type: 'goal', item: active[0] } : null;
    }

    return null;
  }, [txType, categoryId, budgets, goals]);
}
