import { describe, it, expect } from 'vitest';
import { calculateNextDueDate } from '../recurringReminders';

describe('calculateNextDueDate', () => {
  it('should add 1 day for daily interval', () => {
    const current = '2026-01-15T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'daily');
    expect(next).toBe('2026-01-16T12:00:00.000Z');
  });

  it('should add 7 days for weekly interval', () => {
    const current = '2026-01-15T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'weekly');
    expect(next).toBe('2026-01-22T12:00:00.000Z');
  });

  it('should add 1 month for monthly interval', () => {
    const current = '2026-01-15T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'monthly');
    expect(next).toBe('2026-02-15T12:00:00.000Z');
  });

  it('should handle month-end dates correctly (Jan 31 -> Feb 28)', () => {
    const current = '2026-01-31T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'monthly');
    // date-fns correctly handles month-end: Jan 31 -> Feb 28 (non-leap year)
    expect(next).toBe('2026-02-28T12:00:00.000Z');
  });

  it('should handle leap year correctly (Feb 29 -> Mar 29)', () => {
    const current = '2024-02-29T12:00:00.000Z'; // 2024 is a leap year
    const next = calculateNextDueDate(current, 'monthly');
    expect(next).toBe('2024-03-29T12:00:00.000Z');
  });

  it('should add 1 year for yearly interval', () => {
    const current = '2026-03-10T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'yearly');
    expect(next).toBe('2027-03-10T12:00:00.000Z');
  });

  it('should handle leap year to non-leap year transition (Feb 29 -> Feb 28)', () => {
    const current = '2024-02-29T12:00:00.000Z'; // 2024 is leap year
    const next = calculateNextDueDate(current, 'yearly');
    // 2025 is not a leap year, so Feb 29 -> Feb 28
    expect(next).toBe('2025-02-28T12:00:00.000Z');
  });

  it('should advance correctly across year boundaries', () => {
    const current = '2026-12-25T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'weekly');
    expect(next).toBe('2027-01-01T12:00:00.000Z');
  });

  it('should throw error for invalid interval', () => {
    const current = '2026-01-15T12:00:00.000Z';
    // @ts-expect-error - Testing invalid input
    expect(() => calculateNextDueDate(current, 'invalid')).toThrow('Invalid recurring interval');
  });
});
