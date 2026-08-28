/**
 * Pure mapping from a thrown value to the error screen that should be shown.
 *
 * Kept separate from the component (same pattern as `ads.ts`, `theme.ts`,
 * `ratingPrompt.ts`, `subscriptionStatus.ts`) so the branching is unit-testable
 * without rendering anything.
 */

import { toAppError } from '@/lib/errors';

export type ErrorVariant = 'offline' | 'server' | 'notFound' | 'generic';

/**
 * `isOnline` wins over the error itself.
 *
 * `navigator.onLine` reports link state, not reachability, so it is only half the signal:
 * a request that fails while the device claims to be online still resolves to `offline`
 * via NETWORK_ERROR. That second path is what catches captive portals and a dead backend.
 */
export function toErrorVariant(error: unknown, isOnline: boolean): ErrorVariant {
  if (!isOnline) return 'offline';

  const { code } = toAppError(error);

  switch (code) {
    case 'NETWORK_ERROR':
      return 'offline';
    case 'SERVER_ERROR':
    case 'API_ERROR':
    case 'RATE_LIMITED':
      return 'server';
    case 'NOT_FOUND':
      return 'notFound';
    default:
      return 'generic';
  }
}

/** Whether the variant is worth offering a Retry button for. */
export function isRetryableVariant(variant: ErrorVariant): boolean {
  return variant !== 'notFound';
}
