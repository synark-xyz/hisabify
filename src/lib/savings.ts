import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Transaction } from '@/types';

export const SAVINGS_CATEGORY_NAME = 'Savings';
export const SAVINGS_RETURN_CATEGORY_NAME = 'Savings Return';

export type SavingsPlanFrequency = 'daily' | 'weekly' | 'monthly';
export type SavingsPaceStatus = 'on_track' | 'behind' | 'ahead' | 'completed' | 'no_plan';

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
  plan_frequency?: SavingsPlanFrequency | null;
  plan_start_date?: string | null;
  auto_remind?: boolean;
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

export interface SavingsContributionPoint {
  amount: number;
  date: string;
}

export interface SavingsPlanPoint {
  key: string;
  label: string;
  amount: number;
  target: number;
  isCurrent: boolean;
  isMissed: boolean;
}

export interface SavingsPaceInput {
  target_amount: number;
  current_saved: number;
  deadline: string | null;
  created_at: string;
  completed_at?: string | null;
  plan_frequency?: SavingsPlanFrequency | null;
  plan_start_date?: string | null;
  contribution_history: SavingsContributionPoint[];
}

export interface SavingsPaceResult {
  required_per_period: number;
  periods_remaining: number;
  current_pace: number;
  current_period_amount: number;
  status: SavingsPaceStatus;
  suggested_deadline: string | null;
  period_label: 'day' | 'week' | 'month';
  period_label_plural: 'days' | 'weeks' | 'months';
  sparkline: SavingsPlanPoint[];
}

let cachedCategoryMap: SavingsCategoryMap | null = null;

function getPeriodLabel(frequency: SavingsPlanFrequency): SavingsPaceResult['period_label'] {
  switch (frequency) {
    case 'daily':
      return 'day';
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
  }
}

function getPeriodLabelPlural(frequency: SavingsPlanFrequency): SavingsPaceResult['period_label_plural'] {
  switch (frequency) {
    case 'daily':
      return 'days';
    case 'weekly':
      return 'weeks';
    case 'monthly':
      return 'months';
  }
}

function getPeriodStart(date: Date, frequency: SavingsPlanFrequency): Date {
  switch (frequency) {
    case 'daily':
      return startOfDay(date);
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: 1 });
    case 'monthly':
      return startOfMonth(date);
  }
}

function getPeriodEnd(date: Date, frequency: SavingsPlanFrequency): Date {
  switch (frequency) {
    case 'daily':
      return endOfDay(date);
    case 'weekly':
      return endOfWeek(date, { weekStartsOn: 1 });
    case 'monthly':
      return endOfMonth(date);
  }
}

function stepPeriod(date: Date, frequency: SavingsPlanFrequency, count = 1): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, count);
    case 'weekly':
      return addWeeks(date, count);
    case 'monthly':
      return addMonths(date, count);
  }
}

function buildPeriodKey(date: Date, frequency: SavingsPlanFrequency): string {
  switch (frequency) {
    case 'daily':
      return format(date, 'yyyy-MM-dd');
    case 'weekly':
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'monthly':
      return format(date, 'yyyy-MM');
  }
}

function buildPeriodLabel(date: Date, frequency: SavingsPlanFrequency): string {
  switch (frequency) {
    case 'daily':
      return format(date, 'MMM d');
    case 'weekly':
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d');
    case 'monthly':
      return format(date, 'MMM');
  }
}

function countFuturePeriods(fromDate: Date, untilDate: Date, frequency: SavingsPlanFrequency): number {
  if (isBefore(untilDate, fromDate)) {
    return 0;
  }

  let count = 0;
  let cursor = startOfDay(fromDate);
  while (!isAfter(cursor, untilDate)) {
    count += 1;
    cursor = stepPeriod(cursor, frequency);
  }
  return count;
}

function countElapsedPeriods(startDate: Date, now: Date, frequency: SavingsPlanFrequency): number {
  if (isAfter(startDate, now)) {
    return 1;
  }

  let count = 0;
  let cursor = startOfDay(startDate);
  while (!isAfter(cursor, now)) {
    count += 1;
    cursor = stepPeriod(cursor, frequency);
  }
  return Math.max(count, 1);
}

function buildSparkline(params: {
  frequency: SavingsPlanFrequency;
  contributionHistory: SavingsContributionPoint[];
  requiredPerPeriod: number;
}): SavingsPlanPoint[] {
  const now = new Date();
  const buckets: SavingsPlanPoint[] = [];

  for (let index = 7; index >= 0; index -= 1) {
    const cursor = stepPeriod(now, params.frequency, -index);
    const periodStart = getPeriodStart(cursor, params.frequency);
    const periodEnd = getPeriodEnd(cursor, params.frequency);
    const key = buildPeriodKey(periodStart, params.frequency);
    const amount = params.contributionHistory
      .filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= periodStart && entryDate <= periodEnd;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    buckets.push({
      key,
      label: buildPeriodLabel(periodStart, params.frequency),
      amount,
      target: params.requiredPerPeriod,
      isCurrent: index === 0,
      isMissed: index !== 0 && amount <= 0,
    });
  }

  return buckets;
}

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

export function calculateSavingsPace(goal: SavingsPaceInput): SavingsPaceResult {
  const remaining = Math.max(goal.target_amount - goal.current_saved, 0);
  const now = new Date();
  const contributionHistory = (goal.contribution_history || []).filter((entry) => new Date(entry.date) <= now);

  if (goal.completed_at || goal.current_saved >= goal.target_amount) {
    return {
      required_per_period: 0,
      periods_remaining: 0,
      current_pace: 0,
      current_period_amount: 0,
      status: 'completed',
      suggested_deadline: null,
      period_label: 'month',
      period_label_plural: 'months',
      sparkline: [],
    };
  }

  if (!goal.plan_frequency || !goal.deadline) {
    return {
      required_per_period: 0,
      periods_remaining: 0,
      current_pace: 0,
      current_period_amount: 0,
      status: 'no_plan',
      suggested_deadline: null,
      period_label: 'month',
      period_label_plural: 'months',
      sparkline: [],
    };
  }

  const frequency = goal.plan_frequency;
  const deadline = new Date(goal.deadline);
  const startDate = new Date(goal.plan_start_date || goal.created_at);
  const periodsRemaining = Math.max(countFuturePeriods(now, deadline, frequency), 1);
  const elapsedPeriods = countElapsedPeriods(startDate, now, frequency);
  const requiredPerPeriod = periodsRemaining > 0 ? remaining / periodsRemaining : remaining;
  const currentPace = elapsedPeriods > 0
    ? contributionHistory.reduce((sum, entry) => sum + entry.amount, 0) / elapsedPeriods
    : 0;
  const currentPeriodStart = getPeriodStart(now, frequency);
  const currentPeriodEnd = getPeriodEnd(now, frequency);
  const currentPeriodAmount = contributionHistory
    .filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= currentPeriodStart && entryDate <= currentPeriodEnd;
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  let status: SavingsPaceStatus = 'behind';
  if (currentPace >= requiredPerPeriod * 1.05) {
    status = 'ahead';
  } else if (currentPace >= requiredPerPeriod * 0.95) {
    status = 'on_track';
  }

  let suggestedDeadline: string | null = null;
  if (status === 'behind' && currentPace > 0) {
    const periodsNeeded = Math.ceil(remaining / currentPace);
    suggestedDeadline = stepPeriod(now, frequency, periodsNeeded).toISOString();
  }

  return {
    required_per_period: Number(requiredPerPeriod.toFixed(2)),
    periods_remaining: periodsRemaining,
    current_pace: Number(currentPace.toFixed(2)),
    current_period_amount: Number(currentPeriodAmount.toFixed(2)),
    status,
    suggested_deadline: suggestedDeadline,
    period_label: getPeriodLabel(frequency),
    period_label_plural: getPeriodLabelPlural(frequency),
    sparkline: buildSparkline({
      frequency,
      contributionHistory,
      requiredPerPeriod: Number(requiredPerPeriod.toFixed(2)),
    }),
  };
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

export function buildMissedSavingsPeriods(params: {
  contributionHistory: Array<{ amount: number; date: string }>;
  frequency: SavingsPlanFrequency;
  startDate: string;
}): string[] {
  const misses: string[] = [];
  const contributionKeys = new Set(
    params.contributionHistory.map((entry) => buildPeriodKey(new Date(entry.date), params.frequency))
  );

  let cursor = getPeriodStart(new Date(params.startDate), params.frequency);
  const now = new Date();

  while (isBefore(cursor, now)) {
    const key = buildPeriodKey(cursor, params.frequency);
    if (!contributionKeys.has(key)) {
      misses.push(buildPeriodLabel(cursor, params.frequency));
    }
    cursor = stepPeriod(cursor, params.frequency);
  }

  return misses;
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

  return buildMissedSavingsPeriods({
    contributionHistory: params.contributionHistory,
    frequency: params.autoContributeFrequency,
    startDate: params.createdAt,
  });
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

  let savingsCategoryId = data?.find((category) => category.name === SAVINGS_CATEGORY_NAME)?.id;
  let savingsReturnCategoryId = data?.find((category) => category.name === SAVINGS_RETURN_CATEGORY_NAME)?.id;

  if (!savingsCategoryId || !savingsReturnCategoryId) {
    const toUpsert = [
      { name: SAVINGS_CATEGORY_NAME, icon: 'target', color: '#10B981', type: 'expense', category_type: 'savings' },
      { name: SAVINGS_RETURN_CATEGORY_NAME, icon: 'wallet', color: '#3B82F6', type: 'income', category_type: 'savings_return' },
    ];
    const { data: seeded, error: seedError } = await supabase
      .from('categories')
      .upsert(toUpsert, { onConflict: 'name' })
      .select('id, name');
    if (seedError) {
      throw seedError;
    }
    savingsCategoryId = seeded?.find((c) => c.name === SAVINGS_CATEGORY_NAME)?.id ?? savingsCategoryId;
    savingsReturnCategoryId = seeded?.find((c) => c.name === SAVINGS_RETURN_CATEGORY_NAME)?.id ?? savingsReturnCategoryId;
  }

  if (!savingsCategoryId || !savingsReturnCategoryId) {
    throw new Error('Savings categories are not configured');
  }

  cachedCategoryMap = { savingsCategoryId, savingsReturnCategoryId };
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

  const monthSpan = Math.max(
    Math.floor(differenceInCalendarDays(new Date(), new Date(createdAt)) / 30) + 1,
    1
  );
  const total = contributionHistory.reduce((sum, entry) => sum + entry.amount, 0);
  return total / monthSpan;
}

export function getSavingsReminderLabel(reminder: {
  title: string;
  amount: number;
  recurring_interval: string | null;
  savings_goal_id?: string | null;
}, formatAmountFn: (value: number) => string): string {
  if (!reminder.savings_goal_id) {
    return reminder.title;
  }

  const goalName = reminder.title.replace(/^Savings:\s*/, '');
  const frequency = reminder.recurring_interval ? `${reminder.recurring_interval[0].toUpperCase()}${reminder.recurring_interval.slice(1)}` : 'Planned';
  return `💰 ${goalName} — ${frequency} Save · ${formatAmountFn(reminder.amount)}`;
}

export function isSavingsReminder(reminder: { savings_goal_id?: string | null }): boolean {
  return Boolean(reminder.savings_goal_id);
}

export function getNextReminderDueDate(currentDueDate: string, interval: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const currentDate = new Date(currentDueDate);
  switch (interval) {
    case 'daily':
      return addDays(currentDate, 1).toISOString();
    case 'weekly':
      return addWeeks(currentDate, 1).toISOString();
    case 'monthly':
      return addMonths(currentDate, 1).toISOString();
    case 'yearly':
      return addYears(currentDate, 1).toISOString();
  }
}
