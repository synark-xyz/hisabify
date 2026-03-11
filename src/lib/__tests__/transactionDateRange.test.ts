import { describe, it, expect } from 'vitest';
import {
  getViewRange,
  type TransactionViewMode,
} from '../transactionDateRange';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';

// Reference date used throughout: Wednesday 2026-03-11
const REFERENCE = new Date('2026-03-11T14:30:00');

describe('getViewRange', () => {
  // -------------------------------------------------------------------------
  // day
  // -------------------------------------------------------------------------
  describe('day mode', () => {
    it('sets start to the beginning of the given day', () => {
      const { start } = getViewRange('day', REFERENCE);
      expect(start.getTime()).toBe(startOfDay(REFERENCE).getTime());
    });

    it('sets end to the end of the given day', () => {
      const { end } = getViewRange('day', REFERENCE);
      expect(end.getTime()).toBe(endOfDay(REFERENCE).getTime());
    });

    it('start and end are within the same calendar day', () => {
      const { start, end } = getViewRange('day', REFERENCE);
      expect(start.getDate()).toBe(end.getDate());
      expect(start.getMonth()).toBe(end.getMonth());
    });
  });

  // -------------------------------------------------------------------------
  // week (Monday-start convention)
  // -------------------------------------------------------------------------
  describe('week mode', () => {
    it('sets start to the beginning of the Monday-anchored week', () => {
      const { start } = getViewRange('week', REFERENCE);
      expect(start.getTime()).toBe(
        startOfWeek(REFERENCE, { weekStartsOn: 1 }).getTime()
      );
    });

    it('sets end to the end of the Sunday-ending week', () => {
      const { end } = getViewRange('week', REFERENCE);
      expect(end.getTime()).toBe(
        endOfWeek(REFERENCE, { weekStartsOn: 1 }).getTime()
      );
    });

    it('start day-of-week is Monday (1)', () => {
      const { start } = getViewRange('week', REFERENCE);
      expect(start.getDay()).toBe(1);
    });

    it('end day-of-week is Sunday (0)', () => {
      const { end } = getViewRange('week', REFERENCE);
      expect(end.getDay()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // month
  // -------------------------------------------------------------------------
  describe('month mode', () => {
    it('sets start to the first day of the month', () => {
      const { start } = getViewRange('month', REFERENCE);
      expect(start.getTime()).toBe(startOfMonth(REFERENCE).getTime());
    });

    it('sets end to the last day of the month', () => {
      const { end } = getViewRange('month', REFERENCE);
      expect(end.getTime()).toBe(endOfMonth(REFERENCE).getTime());
    });

    it('start is on day 1', () => {
      const { start } = getViewRange('month', REFERENCE);
      expect(start.getDate()).toBe(1);
    });

    it('end is on the last day of the month for March (day 31)', () => {
      const { end } = getViewRange('month', REFERENCE);
      expect(end.getDate()).toBe(31);
    });
  });

  // -------------------------------------------------------------------------
  // year
  // -------------------------------------------------------------------------
  describe('year mode', () => {
    it('sets start to January 1st of the given year', () => {
      const { start } = getViewRange('year', REFERENCE);
      expect(start.getTime()).toBe(startOfYear(REFERENCE).getTime());
    });

    it('sets end to December 31st of the given year', () => {
      const { end } = getViewRange('year', REFERENCE);
      expect(end.getTime()).toBe(endOfYear(REFERENCE).getTime());
    });

    it('start is on Jan 1', () => {
      const { start } = getViewRange('year', REFERENCE);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
    });

    it('end is on Dec 31', () => {
      const { end } = getViewRange('year', REFERENCE);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });

  // -------------------------------------------------------------------------
  // Unknown / invalid mode — falls back to month
  // -------------------------------------------------------------------------
  describe('unknown mode fallback', () => {
    it('falls back to month range for an unrecognised mode string', () => {
      const { start, end } = getViewRange('unknown' as TransactionViewMode, REFERENCE);
      expect(start.getTime()).toBe(startOfMonth(REFERENCE).getTime());
      expect(end.getTime()).toBe(endOfMonth(REFERENCE).getTime());
    });
  });

  // -------------------------------------------------------------------------
  // Cross-boundary correctness
  // -------------------------------------------------------------------------
  describe('cross-boundary dates', () => {
    it('handles year-end date correctly (Dec 31)', () => {
      const yearEnd = new Date('2025-12-31T23:59:00');
      const { start, end } = getViewRange('month', yearEnd);
      expect(start.getMonth()).toBe(11); // December
      expect(end.getMonth()).toBe(11);
    });

    it('handles leap year February correctly', () => {
      const leapDay = new Date('2024-02-15');
      const { end } = getViewRange('month', leapDay);
      expect(end.getDate()).toBe(29); // 2024 is a leap year
    });

    it('handles non-leap year February correctly', () => {
      const feb2025 = new Date('2025-02-15');
      const { end } = getViewRange('month', feb2025);
      expect(end.getDate()).toBe(28); // 2025 is not a leap year
    });
  });
});
