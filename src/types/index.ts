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
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  is_system_category?: boolean;
  category_type?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  card_id: string | null;
  category_id: string | null;
  merchant: string;
  amount: number;
  type: 'expense' | 'income' | 'lend' | 'owe';
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
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
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
}
