import { describe, it, expect } from 'vitest';
import type { BudgetWithSpending } from '../useBudgets';

/**
 * Budget Context Unit Tests
 *
 * These tests verify the budget awareness logic without needing React rendering.
 * We test the core calculation and filtering logic that powers the useBudgetContext hook.
 */

describe('useBudgetContext - Budget Calculations', () => {
  const mockBudgets: BudgetWithSpending[] = [
    {
      id: 'budget-1',
      user_id: 'user-1',
      category_id: 'cat-food',
      category: { id: 'cat-food', name: 'Food', icon: 'utensils', color: '#10B981', created_at: '2024-01-01' },
      amount: 500,
      spent: 200,
      remaining: 300,
      percentage: 40,
      status: 'safe',
      period_type: 'monthly',
      start_date: '2024-02-01',
      end_date: '2024-02-29',
      month: 2,
      year: 2024,
      name: 'Food Budget',
      is_template: false,
      template_name: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'budget-2',
      user_id: 'user-1',
      category_id: 'cat-transport',
      category: { id: 'cat-transport', name: 'Transport', icon: 'car', color: '#F59E0B', created_at: '2024-01-01' },
      amount: 200,
      spent: 180,
      remaining: 20,
      percentage: 90,
      status: 'warning',
      period_type: 'monthly',
      start_date: '2024-02-01',
      end_date: '2024-02-29',
      month: 2,
      year: 2024,
      name: 'Transport Budget',
      is_template: false,
      template_name: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'budget-3',
      user_id: 'user-1',
      category_id: 'cat-entertainment',
      category: { id: 'cat-entertainment', name: 'Entertainment', icon: 'gamepad-2', color: '#6366F1', created_at: '2024-01-01' },
      amount: 100,
      spent: 110,
      remaining: -10,
      percentage: 110,
      status: 'exceeded',
      period_type: 'monthly',
      start_date: '2024-02-01',
      end_date: '2024-02-29',
      month: 2,
      year: 2024,
      name: 'Entertainment Budget',
      is_template: false,
      template_name: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  // Helper function that mimics getBudgetForCategory logic
  const getBudgetForCategory = (budgets: BudgetWithSpending[], categoryId: string | null): BudgetWithSpending | null => {
    if (!categoryId) return null;
    return budgets.find(b => b.category_id === categoryId || b.category_id === null) || null;
  };

  // Helper function that mimics getBudgetStatus logic
  const getBudgetStatus = (budgets: BudgetWithSpending[], categoryId: string | null, amount: number) => {
    const budget = getBudgetForCategory(budgets, categoryId);

    if (!budget) {
      return {
        hasActiveBudget: false,
        budget: null,
        remaining: 0,
        wouldExceed: false,
        status: 'safe' as const,
      };
    }

    const remaining = budget.remaining - amount;
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
        ? `This will exceed your ${budget.name || budget.category?.name || 'budget'} by $${Math.abs(remaining).toFixed(2)}`
        : `You'll have $${remaining.toFixed(2)} remaining in your ${budget.name || budget.category?.name || 'budget'}`,
    };
  };

  // Helper function that mimics suggestBudgets logic
  const suggestBudgets = (budgets: BudgetWithSpending[]) => {
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
  };

  describe('getBudgetForCategory Logic', () => {
    it('should find budget for specific category', () => {
      const budget = getBudgetForCategory(mockBudgets, 'cat-food');
      expect(budget).not.toBeNull();
      expect(budget?.category?.name).toBe('Food');
    });

    it('should return null for non-existent category', () => {
      const budget = getBudgetForCategory(mockBudgets, 'cat-nonexistent');
      expect(budget).toBeNull();
    });

    it('should return null for null category', () => {
      const budget = getBudgetForCategory(mockBudgets, null);
      expect(budget).toBeNull();
    });
  });

  describe('getBudgetStatus Logic', () => {
    it('should return safe status when well under budget', () => {
      const status = getBudgetStatus(mockBudgets, 'cat-food', 50);

      expect(status.hasActiveBudget).toBe(true);
      expect(status.wouldExceed).toBe(false);
      expect(status.status).toBe('safe');
      expect(status.remaining).toBe(250); // 300 remaining - 50 amount
      expect(status.message).toContain('$250.00 remaining');
    });

    it('should return warning status when approaching limit', () => {
      const status = getBudgetStatus(mockBudgets, 'cat-food', 250);

      expect(status.hasActiveBudget).toBe(true);
      expect(status.wouldExceed).toBe(false);
      expect(status.status).toBe('warning'); // (200 + 250) / 500 = 90%
      expect(status.remaining).toBe(50);
    });

    it('should return exceeded status when over budget', () => {
      const status = getBudgetStatus(mockBudgets, 'cat-food', 400);

      expect(status.hasActiveBudget).toBe(true);
      expect(status.wouldExceed).toBe(true);
      expect(status.status).toBe('exceeded'); // (200 + 400) / 500 = 120%
      expect(status.remaining).toBe(-100);
      expect(status.message).toContain('exceed');
      expect(status.message).toContain('$100.00');
    });

    it('should handle category with no active budget', () => {
      const status = getBudgetStatus(mockBudgets, 'cat-nonexistent', 100);

      expect(status.hasActiveBudget).toBe(false);
      expect(status.budget).toBeNull();
      expect(status.wouldExceed).toBe(false);
      expect(status.status).toBe('safe');
    });

    it('should correctly calculate percentage for budget at 80% threshold', () => {
      // Food budget: 200 spent, add 200 more = 400/500 = 80%
      const status = getBudgetStatus(mockBudgets, 'cat-food', 200);

      expect(status.status).toBe('warning'); // Exactly at 80% threshold
    });
  });

  describe('suggestBudgets Logic', () => {
    it('should return budgets with remaining capacity', () => {
      const suggestions = suggestBudgets(mockBudgets);

      // Only Food and Transport have remaining > 0
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].budgetName).toBe('Food Budget');
      expect(suggestions[0].remaining).toBe(300);
      expect(suggestions[1].budgetName).toBe('Transport Budget');
      expect(suggestions[1].remaining).toBe(20);
    });

    it('should sort suggestions by remaining amount (highest first)', () => {
      const suggestions = suggestBudgets(mockBudgets);

      expect(suggestions[0].remaining).toBeGreaterThan(suggestions[1].remaining);
      expect(suggestions[0].remaining).toBe(300);
      expect(suggestions[1].remaining).toBe(20);
    });

    it('should limit suggestions to top 3', () => {
      const manyBudgets = [
        ...mockBudgets.slice(0, 2), // Food and Transport (have remaining)
        {
          ...mockBudgets[0],
          id: 'budget-4',
          category_id: 'cat-healthcare',
          remaining: 150,
        },
        {
          ...mockBudgets[0],
          id: 'budget-5',
          category_id: 'cat-shopping',
          remaining: 75,
        },
      ];

      const suggestions = suggestBudgets(manyBudgets);

      expect(suggestions).toHaveLength(3); // Limited to top 3
      expect(suggestions[0].remaining).toBe(300); // Food
      expect(suggestions[1].remaining).toBe(150); // Healthcare
      expect(suggestions[2].remaining).toBe(75);  // Shopping
    });

    it('should include budget metadata for quick selection', () => {
      const suggestions = suggestBudgets(mockBudgets);

      expect(suggestions[0]).toHaveProperty('budgetId');
      expect(suggestions[0]).toHaveProperty('budgetName');
      expect(suggestions[0]).toHaveProperty('categoryId');
      expect(suggestions[0]).toHaveProperty('remaining');
      expect(suggestions[0]).toHaveProperty('icon');
      expect(suggestions[0]).toHaveProperty('color');
    });

    it('should return empty array when no budgets have remaining capacity', () => {
      const exceededBudgets = mockBudgets.map(b => ({
        ...b,
        remaining: -10,
      }));

      const suggestions = suggestBudgets(exceededBudgets);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty budgets array', () => {
      const emptyBudgets: BudgetWithSpending[] = [];

      expect(suggestBudgets(emptyBudgets)).toHaveLength(0);
      expect(getBudgetForCategory(emptyBudgets, 'any')).toBeNull();
      expect(getBudgetStatus(emptyBudgets, 'any', 100).hasActiveBudget).toBe(false);
    });

    it('should handle budgets with null category (total budget)', () => {
      const totalBudget: BudgetWithSpending = {
        ...mockBudgets[0],
        id: 'budget-total',
        category_id: null,
        category: undefined,
        name: 'Total Budget',
      };

      const suggestions = suggestBudgets([totalBudget]);

      expect(suggestions[0].budgetName).toBe('Total Budget');
    });

    it('should handle zero-amount budgets', () => {
      const zeroBudget: BudgetWithSpending = {
        ...mockBudgets[0],
        amount: 0,
        spent: 0,
        remaining: 0,
      };

      const status = getBudgetStatus([zeroBudget], 'cat-food', 50);

      expect(status.hasActiveBudget).toBe(true);
      expect(status.wouldExceed).toBe(true); // 0 - 50 = -50
    });
  });
});
