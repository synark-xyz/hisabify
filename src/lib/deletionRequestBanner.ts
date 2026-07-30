import { format } from 'date-fns';

// Matches the Privacy Policy's "Response: 30 days" commitment (see
// src/lib/legalContent.tsx §8/§9) and the spec's decision that the retention
// clock starts at the request, not at admin approval.
export const DELETION_RESPONSE_DAYS = 30;

export function getDeletionDeadline(requestedAt: string): Date {
  const requested = new Date(requestedAt);
  return new Date(requested.getTime() + DELETION_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
}

export function formatDeletionRequestedDate(requestedAt: string): string {
  return format(new Date(requestedAt), 'MMM d, yyyy');
}

export function formatDeletionDeadline(requestedAt: string): string {
  return format(getDeletionDeadline(requestedAt), 'MMM d, yyyy');
}
