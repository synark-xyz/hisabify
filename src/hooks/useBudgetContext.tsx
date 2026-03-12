import { useCallback } from 'react';
import { useBudgets, BudgetWithSpending } from './useBudgets';

interface BudgetStatus {
  hasActiveBudget: boolean;
  budget: BudgetWithSpending | null;
  remaining: number;
  wouldExceed: boolean;
  status: 'safe' | 'warning' | 'exceeded';
  message?: string;
}

interface BudgetSuggestion {
  budgetId: string;
  budgetName: string;
  categoryId: string | null;
  remaining: number;
  icon?: string;
  color?: string;
}

export function useBudgetContext() {
  const { budgets, loading } = useBudgets();

  // Return all active budgets relevant to a category:
  // exact-category budgets first, then total-budget (category_id = null) entries.
  const getBudgetsForCategory = useCallback((categoryId: string | null | undefined): BudgetWithSpending[] => {
    if (!categoryId) return budgets.filter(b => b.category_id === null);
    return [
      ...budgets.filter(b => b.category_id === categoryId),
      ...budgets.filter(b => b.category_id === null),
    ];
  }, [budgets]);

  // Find budget matching category
  const getBudgetForCategory = useCallback((categoryId: string | null): BudgetWithSpending | null => {
    if (!categoryId) return null;

    // Prefer exact category budget, then fallback to a general budget.
    const exactMatch = budgets.find((budget) => budget.category_id === categoryId);
    if (exactMatch) {
      return exactMatch;
    }

    return budgets.find((budget) => budget.category_id === null) || null;
  }, [budgets]);

  // Check if transaction would exceed budget
  const getBudgetStatus = useCallback((
    categoryId: string | null,
    amount: number
  ): BudgetStatus => {
    const budget = getBudgetForCategory(categoryId);

    if (!budget) {
      return {
        hasActiveBudget: false,
        budget: null,
        remaining: 0,
        wouldExceed: false,
        status: 'safe',
      };
    }

    const currentRemaining = budget.amount - budget.spent;
    const remaining = currentRemaining - amount;
    const newSpent = budget.spent + amount;
    const newPercentage = (newSpent / budget.amount) * 100;

    let status: 'safe' | 'warning' | 'exceeded' = 'safe';
    if (newPercentage >= 100) status = 'exceeded';
    else if (newPercentage >= 80) status = 'warning';

    return {
      hasActiveBudget: true,
      budget,
      remaining,
      wouldExceed: remaining < 0,
      status,
      message: remaining < 0
        ? `This will exceed your ${budget.name || budget.category?.name || 'budget'} by ${Math.abs(remaining).toFixed(2)}`
        : `You will have ${remaining.toFixed(2)} remaining in your ${budget.name || budget.category?.name || 'budget'}`,
    };
  }, [getBudgetForCategory]);

  // Suggest budgets with remaining capacity
  const suggestBudgets = useCallback((): BudgetSuggestion[] => {
    return budgets
      .filter(b => b.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 3)
      .map(b => ({
        budgetId: b.id,
        budgetName: b.name || b.category?.name || 'Total Budget',
        categoryId: b.category_id,
        remaining: b.remaining,
        icon: b.category?.icon,
        color: b.category?.color,
      }));
  }, [budgets]);

  return {
    budgets,
    loading,
    getBudgetForCategory,
    getBudgetsForCategory,
    getBudgetStatus,
    suggestBudgets,
  };
}
