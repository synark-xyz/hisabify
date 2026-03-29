/// <reference lib="webworker" />

import { performPeriodicSync } from '@/lib/localDB/sync';

declare const self: ServiceWorkerGlobalScope;

// Service Worker for periodic background sync
// Runs daily to sync local DB to Supabase

interface SyncMessage {
  type: 'INIT_SYNC' | 'CHECK_SYNC' | 'PERFORM_SYNC';
  userId?: string;
  unsyncedData?: {
    transactions: any[];
    insights: any[];
  };
}

interface SyncResponse {
  type: 'SYNC_COMPLETE' | 'SYNC_FAILED' | 'SYNC_STATUS';
  success?: boolean;
  syncedCount?: number;
  error?: string;
  pendingTransactions?: number;
  pendingInsights?: number;
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event: ExtendableMessageEvent) => {
  const message = event.data as SyncMessage;

  try {
    switch (message.type) {
      case 'INIT_SYNC':
        // Initialize periodic sync (if supported)
        if ('periodicSync' in self.registration) {
          await self.registration.periodicSync.register('sync-local-db', {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          });
        }
        break;

      case 'PERFORM_SYNC':
        // Perform immediate sync
        if (message.userId && message.unsyncedData) {
          const result = await performPeriodicSync(
            async () => message.unsyncedData!,
            message.userId
          );

          const response: SyncResponse = {
            type: 'SYNC_COMPLETE',
            success: result.success,
            syncedCount: result.transactionsSynced + result.insightsSynced,
            error: result.errors.length > 0 ? result.errors[0] : undefined,
          };

          event.ports[0]?.postMessage(response);
        }
        break;

      case 'CHECK_SYNC':
        // Check sync status
        if (message.unsyncedData) {
          const response: SyncResponse = {
            type: 'SYNC_STATUS',
            pendingTransactions: message.unsyncedData.transactions.length,
            pendingInsights: message.unsyncedData.insights.length,
          };

          event.ports[0]?.postMessage(response);
        }
        break;
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    const response: SyncResponse = {
      type: 'SYNC_FAILED',
      success: false,
      error,
    };

    event.ports[0]?.postMessage(response);
  }
});

/**
 * Handle periodic sync event
 */
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'sync-local-db') {
    // Notify main thread to perform sync
    // This would be handled by the main thread since it has access to local DB
    console.log('Periodic sync event triggered');
  }
});

/**
 * Handle push notifications (optional)
 */
self.addEventListener('push', (event: PushEvent) => {
  if (event.data) {
    const data = event.data.json();
    const options: NotificationOptions = {
      body: data.body || 'New financial insight',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'financial-insight',
    };

    event.waitUntil(self.registration.showNotification('Hisabify', options));
  }
});

export {}; // Make this a module
