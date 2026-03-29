import { LocalTransaction, LocalInsight, SyncResult } from '@/types/localAI';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sync unsynced data to Supabase
 * Called daily or on demand
 */
export async function syncToSupabase(
  unsyncedData: {
    transactions: LocalTransaction[];
    insights: LocalInsight[];
  },
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    transactionsSynced: 0,
    insightsSynced: 0,
    errors: [],
    lastSyncTime: new Date(),
  };

  try {
    // Early exit if nothing to sync
    if (unsyncedData.transactions.length === 0 && unsyncedData.insights.length === 0) {
      logger.debug('No unsynced data to sync');
      return result;
    }

    // 1. Sync transactions
    if (unsyncedData.transactions.length > 0) {
      try {
        const txsToSync = unsyncedData.transactions.map(tx => ({
          merchant: tx.merchant,
          amount: tx.amount,
          category_id: tx.category_id || null,
          date: tx.date,
          note: tx.note || '',
          type: tx.type || 'expense',
          // Store AI predictions in metadata for future training
          metadata: {
            predicted_category_id: tx.category_predicted,
            predicted_confidence: tx.category_confidence,
          },
        }));

        const { error } = await supabase.from('transactions').insert(txsToSync);

        if (error) {
          logger.error('Failed to sync transactions', error);
          result.errors.push(`Transactions sync failed: ${error.message}`);
        } else {
          result.transactionsSynced = txsToSync.length;
          logger.debug(`Synced ${result.transactionsSynced} transactions`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Transaction sync exception', error);
        result.errors.push(`Transaction sync exception: ${error.message}`);
      }
    }

    // 2. Sync insights (only non-internal ones)
    const insightsToSync = unsyncedData.insights.filter(i => i.type !== 'spending_habits');

    if (insightsToSync.length > 0) {
      try {
        const formattedInsights = insightsToSync.map(i => ({
          user_id: userId,
          type: i.type,
          category_id: i.category_id || null,
          title: i.title,
          description: i.description,
          severity: i.metadata?.anomalySeverity || 0,
          metadata: i.metadata || {},
        }));

        const { error } = await supabase.from('spending_insights').insert(formattedInsights);

        if (error) {
          logger.error('Failed to sync insights', error);
          result.errors.push(`Insights sync failed: ${error.message}`);
        } else {
          result.insightsSynced = insightsToSync.length;
          logger.debug(`Synced ${result.insightsSynced} insights`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Insight sync exception', error);
        result.errors.push(`Insight sync exception: ${error.message}`);
      }
    }

    // 3. Store internal spending habits for future model training
    const spendingHabits = unsyncedData.insights.filter(i => i.type === 'spending_habits');
    if (spendingHabits.length > 0) {
      try {
        const habitData = spendingHabits.map(h => ({
          user_id: userId,
          category_id: h.category_id || null,
          frequency_per_week: h.metadata?.frequencyScore || 0,
          average_transaction: h.metadata?.averageAmount || 0,
          total_transactions: h.metadata?.transactionCount || 0,
          metadata: h.metadata || {},
        }));

        await supabase.from('user_spending_habits').insert(habitData).then(({ error }) => {
          if (error) {
            logger.warn('Failed to sync spending habits', error);
          } else {
            logger.debug(`Synced ${habitData.length} spending habit records`);
          }
        });
      } catch (err) {
        logger.warn('Spending habits sync failed (non-critical)', err);
        // Don't fail entire sync for this
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Sync failed', error);
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Get sync status (for debugging)
 */
export async function getSyncStatus(
  unsyncedData: {
    transactions: LocalTransaction[];
    insights: LocalInsight[];
  }
): Promise<{ pendingTransactions: number; pendingInsights: number; lastSync?: Date }> {
  return {
    pendingTransactions: unsyncedData.transactions.length,
    pendingInsights: unsyncedData.insights.length,
  };
}

/**
 * Periodic sync handler
 * Called by service worker or background task
 */
export async function performPeriodicSync(
  getUnsyncedData: () => Promise<{
    transactions: LocalTransaction[];
    insights: LocalInsight[];
  }>,
  userId: string
): Promise<SyncResult> {
  logger.debug('Starting periodic sync...');

  try {
    const unsyncedData = await getUnsyncedData();
    const result = await syncToSupabase(unsyncedData, userId);

    if (result.success) {
      logger.debug('Periodic sync completed successfully');
    } else {
      logger.warn('Periodic sync completed with errors', result.errors);
    }

    return result;
  } catch (err) {
    logger.error('Periodic sync failed', err);
    return {
      success: false,
      transactionsSynced: 0,
      insightsSynced: 0,
      errors: ['Periodic sync failed'],
      lastSyncTime: new Date(),
    };
  }
}
