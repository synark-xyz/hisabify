import { addMonths, addWeeks, differenceInCalendarDays, differenceInCalendarMonths, endOfMonth, format, isAfter, isBefore, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { emitTransactionUpdated } from '@/lib/transaction-events';
import type { Transaction } from '@/types';

export const SAVINGS_CATEGORY_NAME = 'Savings';
export const SAVINGS_RETURN_CATEGORY_NAME = 'Savings Return';

export interface SavingsCategoryMap {
  savingsCategoryId: string;
  savingsReturnCategoryId: string;
}

export interface SavingsGoalFormInput {
  name: string;
  target_amount: number;
  initial_amount?: number;
  deadline?: string | null;
  color: string;
  icon?: string;
  linked_budget_id?: string | null;
  reserve_amount?: number;
  auto_contribute_enabled?: boolean;
  auto_contribute_amount?: number | null;
  auto_contribute_frequency?: 'weekly' | 'monthly' | null;
}

export interface SavingsContributionInput {
  userId: string;
  goalId: string;
  goalName: string;
  amount: number;
  currency: string;
  date?: string;
  budgetId?: string | null;
  merchant?: string;
  note?: string | null;
  transactionType?: 'expense' | 'income';
}

export interface SavingsTransferInput {
  userId: string;
  sourceGoalId: string;
  sourceGoalName: string;
  destinationGoalId: string;
  destinationGoalName: string;
  amount: number;
  currency: string;
}

let cachedCategoryMap: SavingsCategoryMap | null = null;

export function isSavingsContributionTransaction(tx: Pick<Transaction, 'category' | 'type' | 'savings_goal_id'>): boolean {
  return tx.savings_goal_id != null && tx.category?.name === SAVINGS_CATEGORY_NAME;
}

export function isSavingsReturnTransaction(tx: Pick<Transaction, 'category' | 'type' | 'savings_goal_id'>): boolean {
  return tx.savings_goal_id != null && tx.category?.name === SAVINGS_RETURN_CATEGORY_NAME;
}

export function getSavingsNetAmount(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => {
    if (isSavingsContributionTransaction(tx)) {
      return sum + Number(tx.amount_converted || tx.amount);
    }

    if (isSavingsReturnTransaction(tx)) {
      return sum - Number(tx.amount_converted || tx.amount);
    }

    return sum;
  }, 0);
}

export function projectSavingsCompletionDate(params: {
  savedAmount: number;
  targetAmount: number;
  contributionHistory: Array<{ amount: number; date: string }>;
  fallbackDate?: string | null;
}): string | null {
  const remaining = Math.max(params.targetAmount - params.savedAmount, 0);
  if (remaining <= 0) {
    return new Date().toISOString();
  }

  const currentMonthStart = startOfMonth(new Date());
  const monthlyTotal = params.contributionHistory
    .filter((entry) => new Date(entry.date) >= currentMonthStart)
    .reduce((sum, entry) => sum + entry.amount, 0);

  if (monthlyTotal <= 0) {
    return params.fallbackDate || null;
  }

  const monthsNeeded = Math.ceil(remaining / monthlyTotal);
  return endOfMonth(addMonths(new Date(), Math.max(monthsNeeded - 1, 0))).toISOString();
}

export function getSavingsPaceStatus(params: {
  savedAmount: number;
  targetAmount: number;
  createdAt: string;
  deadline: string | null;
  completedAt: string | null;
}): 'completed' | 'on_track' | 'at_risk' | 'behind' {
  if (params.completedAt || params.savedAmount >= params.targetAmount) {
    return 'completed';
  }

  if (!params.deadline) {
    return params.savedAmount > 0 ? 'on_track' : 'at_risk';
  }

  const now = new Date();
  const deadline = new Date(params.deadline);
  if (isBefore(deadline, now)) {
    return 'behind';
  }

  const totalDays = Math.max(differenceInCalendarDays(deadline, new Date(params.createdAt)), 1);
  const elapsedDays = Math.max(differenceInCalendarDays(now, new Date(params.createdAt)), 0);
  const expectedSaved = params.targetAmount * Math.min(elapsedDays / totalDays, 1);

  if (params.savedAmount >= expectedSaved) {
    return 'on_track';
  }

  return differenceInCalendarDays(deadline, now) <= 7 ? 'at_risk' : 'behind';
}

export function buildMissedSavingsMonths(params: {
  contributionHistory: Array<{ amount: number; date: string }>;
  autoContributeEnabled: boolean;
  autoContributeFrequency: 'weekly' | 'monthly' | null;
  createdAt: string;
}): string[] {
  if (!params.autoContributeEnabled || !params.autoContributeFrequency) {
    return [];
  }

  const misses: string[] = [];
  const contributionKeys = new Set(
    params.contributionHistory.map((entry) => format(new Date(entry.date), params.autoContributeFrequency === 'weekly' ? 'yyyy-ww' : 'yyyy-MM'))
  );

  let cursor = startOfMonth(new Date(params.createdAt));
  const now = new Date();

  while (isBefore(cursor, now)) {
    const key = format(cursor, params.autoContributeFrequency === 'weekly' ? 'yyyy-ww' : 'yyyy-MM');
    if (!contributionKeys.has(key)) {
      misses.push(format(cursor, 'MMM yyyy'));
    }
    cursor = params.autoContributeFrequency === 'weekly' ? addWeeks(cursor, 1) : addMonths(cursor, 1);
  }

  return misses;
}

export async function getSavingsCategoryMap(): Promise<SavingsCategoryMap> {
  if (cachedCategoryMap) {
    return cachedCategoryMap;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .in('name', [SAVINGS_CATEGORY_NAME, SAVINGS_RETURN_CATEGORY_NAME]);

  if (error) {
    throw error;
  }

  const savingsCategoryId = data?.find((category) => category.name === SAVINGS_CATEGORY_NAME)?.id;
  const savingsReturnCategoryId = data?.find((category) => category.name === SAVINGS_RETURN_CATEGORY_NAME)?.id;

  if (!savingsCategoryId || !savingsReturnCategoryId) {
    throw new Error('Savings categories are not configured');
  }

  cachedCategoryMap = {
    savingsCategoryId,
    savingsReturnCategoryId,
  };

  return cachedCategoryMap;
}

export async function recordSavingsContribution(input: SavingsContributionInput): Promise<void> {
  const { savingsCategoryId } = await getSavingsCategoryMap();
  const transactionDate = input.date || new Date().toISOString();
  const normalizedAmount = Number(input.amount.toFixed(2));

  const { error } = await supabase.from('transactions').insert({
    user_id: input.userId,
    merchant: input.merchant || input.goalName,
    amount: normalizedAmount,
    amount_original: normalizedAmount,
    amount_converted: normalizedAmount,
    currency_base: input.currency,
    currency_original: input.currency,
    exchange_rate: 1,
    exchange_source: 'same_currency',
    rate_timestamp: transactionDate,
    type: input.transactionType || 'expense',
    date: transactionDate,
    category_id: savingsCategoryId,
    budget_id: input.budgetId ?? null,
    savings_goal_id: input.goalId,
    note: input.note ?? input.goalName,
  });

  if (error) {
    throw error;
  }

  emitTransactionUpdated();
}

export async function recordSavingsReturn(params: {
  userId: string;
  goalId: string;
  goalName: string;
  amount: number;
  currency: string;
  note?: string | null;
}): Promise<void> {
  const { savingsReturnCategoryId } = await getSavingsCategoryMap();
  const normalizedAmount = Number(params.amount.toFixed(2));
  const transactionDate = new Date().toISOString();

  const { error } = await supabase.from('transactions').insert({
    user_id: params.userId,
    merchant: params.goalName,
    amount: normalizedAmount,
    amount_original: normalizedAmount,
    amount_converted: normalizedAmount,
    currency_base: params.currency,
    currency_original: params.currency,
    exchange_rate: 1,
    exchange_source: 'same_currency',
    rate_timestamp: transactionDate,
    type: 'income',
    date: transactionDate,
    category_id: savingsReturnCategoryId,
    savings_goal_id: params.goalId,
    note: params.note ?? params.goalName,
  });

  if (error) {
    throw error;
  }

  emitTransactionUpdated();
}

export async function recordBudgetLeftoverTransfer(params: {
  userId: string;
  budgetId: string;
  budgetName: string;
  budgetCategoryId: string | null;
  goalId: string;
  goalName: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const { savingsCategoryId } = await getSavingsCategoryMap();
  const normalizedAmount = Number(params.amount.toFixed(2));
  const transactionDate = new Date().toISOString();

  const { error } = await supabase.from('transactions').insert([
    {
      user_id: params.userId,
      merchant: params.budgetName,
      amount: normalizedAmount,
      amount_original: normalizedAmount,
      amount_converted: normalizedAmount,
      currency_base: params.currency,
      currency_original: params.currency,
      exchange_rate: 1,
      exchange_source: 'same_currency',
      rate_timestamp: transactionDate,
      type: 'expense',
      date: transactionDate,
      category_id: params.budgetCategoryId,
      budget_id: params.budgetId,
      note: `Transferred to ${params.goalName}`,
    },
    {
      user_id: params.userId,
      merchant: params.goalName,
      amount: normalizedAmount,
      amount_original: normalizedAmount,
      amount_converted: normalizedAmount,
      currency_base: params.currency,
      currency_original: params.currency,
      exchange_rate: 1,
      exchange_source: 'same_currency',
      rate_timestamp: transactionDate,
      type: 'income',
      date: transactionDate,
      category_id: savingsCategoryId,
      budget_id: params.budgetId,
      savings_goal_id: params.goalId,
      note: `From ${params.budgetName}`,
    },
  ]);

  if (error) {
    throw error;
  }

  emitTransactionUpdated();
}

export async function redeploySavingsBetweenGoals(params: SavingsTransferInput): Promise<void> {
  await recordSavingsReturn({
    userId: params.userId,
    goalId: params.sourceGoalId,
    goalName: params.sourceGoalName,
    amount: params.amount,
    currency: params.currency,
    note: `Redeployed to ${params.destinationGoalName}`,
  });

  await recordSavingsContribution({
    userId: params.userId,
    goalId: params.destinationGoalId,
    goalName: params.destinationGoalName,
    amount: params.amount,
    currency: params.currency,
    transactionType: 'expense',
    note: `From ${params.sourceGoalName}`,
  });
}

export function getGoalProjectedMonthlyPace(contributionHistory: Array<{ amount: number; date: string }>): number {
  const now = new Date();
  const start = startOfMonth(now);
  return contributionHistory
    .filter((entry) => new Date(entry.date) >= start)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

export function getMonthsToTarget(savedAmount: number, targetAmount: number, monthlyPace: number): number | null {
  if (savedAmount >= targetAmount) {
    return 0;
  }

  if (monthlyPace <= 0) {
    return null;
  }

  return Math.ceil((targetAmount - savedAmount) / monthlyPace);
}

export function getCompletionLabel(projectedCompletionDate: string | null): string | null {
  if (!projectedCompletionDate) {
    return null;
  }

  return format(new Date(projectedCompletionDate), 'MMM d, yyyy');
}

export function getContributionMonthKey(date: string): string {
  return format(new Date(date), 'yyyy-MM');
}

export function countContributionMonths(contributionHistory: Array<{ amount: number; date: string }>): number {
  return new Set(contributionHistory.map((entry) => getContributionMonthKey(entry.date))).size;
}

export function getAverageMonthlyContribution(contributionHistory: Array<{ amount: number; date: string }>, createdAt: string): number {
  if (contributionHistory.length === 0) {
    return 0;
  }

  const monthSpan = Math.max(differenceInCalendarMonths(new Date(), new Date(createdAt)) + 1, 1);
  const total = contributionHistory.reduce((sum, entry) => sum + entry.amount, 0);
  return total / monthSpan;
}
