export interface Card {
  id: string;
  user_id: string;
  card_number: string;
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
}

export interface Transaction {
  id: string;
  user_id: string;
  card_id: string | null;
  category_id: string | null;
  merchant: string;
  amount: number;
  type: 'expense' | 'income';
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

export interface MonthlySpending {
  month: string;
  amount: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
  created_at: string;
}
