import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocalDB } from './useLocalDB';
import { useCategories } from './useCategories';
import { useSavingsGoals } from './useSavingsGoals';
import { Insight } from '@/types/localAI';
import { analyzeTransactions } from '@/lib/aiModels/insightAnalyzer';
import { logger } from '@/lib/logger';

export function useLocalInsights() {
  const localDB = useLocalDB();
  const { categories } = useCategories();
  const { goals: savingsGoals } = useSavingsGoals();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastComputeRef = useRef<number>(0);

  /**
   * Compute insights from recent transactions
   */
  const computeInsights = useCallback(async () => {
    if (!localDB.isInitialized) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get recent transactions (last 90 days)
      const recentTransactions = await localDB.getRecentTransactions(90);

      if (recentTransactions.length === 0) {
        setInsights([]);
        return;
      }

      // Analyze transactions
      const categoryList = categories.map(c => ({
        id: c.id,
        name: c.name,
      }));

      const savingsGoalsList = savingsGoals.map(g => ({
        id: g.id,
        name: g.name,
        target_amount: g.target_amount,
        current_amount: g.current_amount,
        target_date: g.target_date,
      }));

      const newInsights = await analyzeTransactions(
        recentTransactions,
        categoryList,
        savingsGoalsList
      );

      // Store insights in local DB
      for (const insight of newInsights) {
        // Only store non-spending_habits insights (spending_habits are internal)
        if (insight.type !== 'spending_habits') {
          await localDB.insertInsight({
            id: insight.id,
            type: insight.type,
            category_id: insight.categoryId,
            title: insight.title,
            description: insight.description,
            metadata: insight.metadata,
            synced: false,
          });
        }
      }

      setInsights(newInsights);
      lastComputeRef.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compute insights';
      logger.error('Insights computation failed', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [localDB, categories, savingsGoals]);

  /**
   * Debounced compute insights
   */
  const recomputeInsights = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      computeInsights();
    }, 1000); // Debounce by 1 second
  }, [computeInsights]);

  /**
   * Refresh insights immediately
   */
  const refresh = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await computeInsights();
  }, [computeInsights]);

  /**
   * On mount: compute initial insights
   */
  useEffect(() => {
    if (localDB.isInitialized && categories.length > 0) {
      computeInsights();
    }
  }, [localDB.isInitialized, categories.length]);

  /**
   * Listen for transaction updates and recompute
   */
  useEffect(() => {
    const handleTransactionUpdate = () => {
      recomputeInsights();
    };

    window.addEventListener('transaction-created', handleTransactionUpdate);
    window.addEventListener('budget-updated', handleTransactionUpdate);

    return () => {
      window.removeEventListener('transaction-created', handleTransactionUpdate);
      window.removeEventListener('budget-updated', handleTransactionUpdate);
    };
  }, [recomputeInsights]);

  /**
   * Get insights filtered by type
   */
  const getInsightsByType = useCallback(
    (type: Insight['type']) => {
      return insights.filter(i => i.type === type);
    },
    [insights]
  );

  /**
   * Get top insights (highest severity first, max N)
   */
  const getTopInsights = useCallback(
    (maxCount: number = 5, excludeTypes: Insight['type'][] = []): Insight[] => {
      return insights
        .filter(i => !excludeTypes.includes(i.type))
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, maxCount);
    },
    [insights]
  );

  return {
    insights,
    loading,
    error,
    refresh,
    recomputeInsights,
    getInsightsByType,
    getTopInsights,
  };
}
