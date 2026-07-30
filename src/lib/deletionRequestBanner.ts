import { format } from 'date-fns';

// Matches the Privacy Policy's "Response: 30 days" commitment (see
// src/lib/legalContent.tsx §8/§9) and the spec's decision that the retention
// clock starts at the request, not at admin approval.
export const DELETION_RESPONSE_DAYS = 30;

export function getDeletionDeadline(requestedAt: string): Date {
  const requested = new Date(requestedAt);
  return new Date(requested.getTime() + DELETION_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
}

// Constructs a Date whose local Y/M/D fields equal the original's UTC Y/M/D fields.
// This makes format() timezone-invariant: the calendar date shown is always the UTC date,
// regardless of the host machine's timezone.
function toUtcNormalizedDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatDeletionRequestedDate(requestedAt: string): string {
  return format(toUtcNormalizedDate(new Date(requestedAt)), 'MMM d, yyyy');
}

export function formatDeletionDeadline(requestedAt: string): string {
  return format(toUtcNormalizedDate(getDeletionDeadline(requestedAt)), 'MMM d, yyyy');
}
