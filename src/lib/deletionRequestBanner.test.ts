import { describe, it, expect } from 'vitest';
import {
  DELETION_RESPONSE_DAYS,
  getDeletionDeadline,
  formatDeletionRequestedDate,
  formatDeletionDeadline,
} from './deletionRequestBanner';

describe('deletionRequestBanner', () => {
  it('DELETION_RESPONSE_DAYS is 30', () => {
    expect(DELETION_RESPONSE_DAYS).toBe(30);
  });

  it('getDeletionDeadline adds 30 days to the request timestamp', () => {
    const requestedAt = '2026-07-01T00:00:00.000Z';
    const deadline = getDeletionDeadline(requestedAt);
    expect(deadline.toISOString()).toBe('2026-07-31T00:00:00.000Z');
  });

  it('getDeletionDeadline handles a month boundary correctly', () => {
    const requestedAt = '2026-01-15T12:00:00.000Z';
    const deadline = getDeletionDeadline(requestedAt);
    expect(deadline.toISOString()).toBe('2026-02-14T12:00:00.000Z');
  });

  it('formatDeletionRequestedDate renders a human-readable date', () => {
    expect(formatDeletionRequestedDate('2026-07-30T10:00:00.000Z')).toBe('Jul 30, 2026');
  });

  it('formatDeletionDeadline renders the request date plus 30 days', () => {
    expect(formatDeletionDeadline('2026-07-01T00:00:00.000Z')).toBe('Jul 31, 2026');
  });
});
