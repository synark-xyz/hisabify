import type { Category } from '@/types';

export type PeriodType = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  category?: Category;
  amount: number;
  month: number;
  year: number;
  period_type: PeriodType;
  start_date: string | null;
  end_date: string | null;
  name: string | null;
  is_template: boolean;
  is_recurring: boolean;
  template_name: string | null;
  alert_threshold: number;
  alert_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export type BudgetStatus = 'safe' | 'warning' | 'utilized' | 'exceeded';

export function calculateBudgetStatus(spent: number, budgetAmount: number, threshold = 75): BudgetStatus {
  if (spent > budgetAmount) return 'exceeded';
  if (spent >= budgetAmount) return 'utilized';
  if ((spent / budgetAmount) * 100 >= threshold) return 'warning';
  return 'safe';
}

export function computeBudgetSpending(
  budget: Budget,
  spent: number,
  threshold = 75
): Omit<BudgetWithSpending, keyof Budget> {
  const remaining = Math.max(0, budget.amount - spent);
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  return {
    spent,
    remaining,
    percentage,
    status: calculateBudgetStatus(spent, budget.amount, threshold),
  };
}

export function dedupeBudgetPeriods(budgets: BudgetWithSpending[]): BudgetWithSpending[] {
  const catMap = new Map<string, BudgetWithSpending[]>();
  const now = new Date();

  for (const b of budgets) {
    const key = b.category_id ?? '__total__';
    if (!catMap.has(key)) catMap.set(key, []);
    catMap.get(key)!.push(b);
  }

  const result: BudgetWithSpending[] = [];
  for (const group of catMap.values()) {
    if (group.length === 1) { result.push(group[0]); continue; }

    const current = group.filter(b => {
      if (!b.start_date) return true;
      const s = new Date(b.start_date);
      const e = b.end_date ? new Date(b.end_date) : null;
      return s <= now && (e === null || e >= now);
    });

    const upcoming = group.filter(b => b.start_date && new Date(b.start_date) > now);

    if (current.length > 0) {
      const allDone = current.every(b => b.status === 'utilized' || b.status === 'exceeded');
      result.push(...(allDone && upcoming.length > 0 ? upcoming : current));
    } else {
      result.push(...(upcoming.length > 0 ? upcoming : group));
    }
  }

  return result;
}