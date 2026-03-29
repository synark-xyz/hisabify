/**
 * Local AI and Database Types
 */

export interface LocalTransaction {
  id: string;
  merchant: string;
  amount: number;
  category_id?: string | null;
  category_predicted?: string | null;
  category_confidence?: number | null;
  date: string;
  note?: string;
  type: 'expense' | 'income' | 'lend' | 'owe';
  synced: boolean;
  supabase_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CategorySample {
  id: string;
  category_id: string;
  merchant: string;
  embedding?: Float32Array;
  updated_at: string;
}

export interface LocalInsight {
  id: string;
  type: 'predicted_expense' | 'anomaly' | 'savings_optimization' | 'goal_progress' | 'spending_habits';
  category_id?: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  synced: boolean;
  computed_at: string;
}

export interface Insight {
  id: string;
  type: 'predicted_expense' | 'anomaly' | 'savings_optimization' | 'goal_progress' | 'spending_habits';
  categoryId?: string;
  categoryName?: string;
  title: string;
  description: string;
  severity?: number; // 0-1
  metadata?: {
    percentChange?: number;
    currentAmount?: number;
    previousAmount?: number;
    anomalySeverity?: number;
    predictedAmount?: number;
    targetAmount?: number;
    percentToGoal?: number;
    frequencyScore?: number;
  };
}

export interface SuggestedCategory {
  categoryId: string;
  categoryName: string;
  confidence: number;
  source: 'rule' | 'embedding';
}

export interface SyncResult {
  success: boolean;
  transactionsSynced: number;
  insightsSynced: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface DBConfig {
  dbName: string;
  version: number;
}
