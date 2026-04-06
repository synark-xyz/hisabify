export interface Card {
  id: string;
  user_id: string;
  card_number: string;
  last_four?: string | null;
  card_holder: string;
  expiry_date: string;
  card_type: 'visa' | 'mastercard' | 'amex';
  color: 'purple' | 'green' | 'orange';
  balance: number;
  created_at: string;
  updated_at: string;
  account_type_id?: string | null;
}

export interface AccountType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  is_system_category?: boolean;
  category_type?: string;
  type: 'expense' | 'income';
  parent_id?: string | null;
  usage_count?: number;
  translations?: Record<string, { name: string }>;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'cheque' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  cheque: 'Cheque',
  other: 'Other',
};

export interface Transaction {
  id: string;
  user_id: string;
  card_id: string | null;
  category_id: string | null;
  merchant: string;
  amount: number;
  type: 'expense' | 'income' | 'lend' | 'owe' | 'transfer';
  date: string;
  note: string | null;
  created_at: string;
  category?: Category;
  card?: Card;
  // Multi-currency fields
  amount_original?: number;
  currency_original?: string;
  amount_converted?: number;
  currency_base?: string;
  exchange_rate?: number;
  rate_timestamp?: string;
  exchange_source?: string;
  // Receipt field
  receipt_url?: string | null;
  // Budget linkage
  budget_id?: string | null;
  savings_goal_id?: string | null;
  custom_category_label?: string | null;
  // Phase 1 additions
  tags?: string[];
  status?: 'cleared' | 'uncleared';
  parent_transaction_id?: string | null;
  is_split_child?: boolean;
  // Phase 2 additions
  payment_method?: PaymentMethod | null;
  transfer_to_card_id?: string | null;
  transfer_fee?: number | null;
}

export interface Debt {
  id: string;
  user_id: string;
  person_name: string;
  amount: number;
  currency: string;
  type: 'i_owe' | 'they_owe';
  due_date: string | null;
  status: 'outstanding' | 'partial' | 'settled';
  amount_paid: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
  name?: string;
  period_type?: string;
  start_date?: string;
  end_date?: string;
  is_template?: boolean;
  category?: Category;
}

export interface CategorySpending {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlySpending {
  month: string;
  amount: number;
  year: number;
  topCategory?: string;
  categories?: CategorySpending[];
  comparisonAmount?: number; // For previous year comparison
}

export interface AnalyticsInsight {
  icon: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
  created_at: string;
}

export interface PaymentReminder {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  currency: string;
  due_date: string;
  status: 'upcoming' | 'paid' | 'missed';
  notify_before_days: number;
  is_recurring: boolean;
  recurring_interval: string | null;
  category_id: string | null;
  savings_goal_id?: string | null;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export type ActivityType =
  | 'transaction_added'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'debt_created'
  | 'debt_settled'
  | 'debt_updated'
  | 'debt_deleted'
  | 'budget_created'
  | 'budget_updated'
  | 'budget_deleted'
  | 'savings_goal_created'
  | 'savings_contribution'
  | 'savings_goal_completed'
  | 'savings_goal_archived'
  | 'payment_reminder_created'
  | 'payment_reminder_paid'
  | 'payment_reminder_deleted'
  | 'card_added'
  | 'card_updated'
  | 'card_deleted'
  | 'recurring_expense_created'
  | 'recurring_expense_updated'
  | 'recurring_expense_deleted';

export type EntityType = 'transaction' | 'debt' | 'budget' | 'savings_goal' | 'payment_reminder' | 'card' | 'recurring_expense';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  entity_type: EntityType;
  entity_id: string;
  description: string;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  group_id: string | null;
  created_at: string;
}
