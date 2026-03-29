import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useLocalDB } from './useLocalDB';
import { useLocalAI } from './useLocalAI';
import { logger } from '@/lib/logger';

/**
 * Initialize local DB and AI on app startup
 */
export function useLocalInitialization() {
  const { user } = useAuth();
  const localDB = useLocalDB();
  const localAI = useLocalAI();

  useEffect(() => {
    const initializeLocal = async () => {
      if (!user) {
        return; // Wait for user to be authenticated
      }

      try {
        // Initialize database
        await localDB.init();
        logger.debug('Local DB initialization attempted');
      } catch (err) {
        logger.debug('Local DB initialization skipped or failed', err);
        // Continue - app works without local DB, just with reduced features
      }

      try {
        // Load AI model in background (non-blocking)
        localAI.getEmbedding('test').catch(() => {
          logger.debug('AI model warm-up completed');
        });
      } catch (err) {
        logger.debug('AI model initialization skipped', err);
      }

      // Register periodic sync (if supported)
      if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(reg => {
          reg.periodicSync.register('sync-local-db', {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          }).catch(err => {
            logger.debug('Failed to register periodic sync', err);
          });
        }).catch(err => {
          logger.debug('Service worker not ready for periodic sync', err);
        });
      }
    };

    initializeLocal();
  }, [user, localDB, localAI]);
}
