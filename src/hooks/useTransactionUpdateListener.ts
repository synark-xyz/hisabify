import { useEffect } from 'react';
import { subscribeToTransactionUpdates } from '@/lib/transaction-events';

export function useTransactionUpdateListener(handler: () => void): void {
  useEffect(() => {
    return subscribeToTransactionUpdates(handler);
  }, [handler]);
}
