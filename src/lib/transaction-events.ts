export const TRANSACTION_UPDATED_EVENT = 'transaction-updated';

export function emitTransactionUpdated(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(TRANSACTION_UPDATED_EVENT));
}

export function subscribeToTransactionUpdates(handler: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(TRANSACTION_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(TRANSACTION_UPDATED_EVENT, handler);
  };
}
