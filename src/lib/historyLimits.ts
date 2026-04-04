import { format, startOfMonth, subMonths, startOfDay, isAfter } from 'date-fns';

export interface DateRangeValue {
  from: Date;
  to: Date;
}

/**
 * Get the minimum allowed date for BASE (free) users.
 * BASE users can only see current month + last month's data.
 */
export function getFreeHistoryStartDate(now: Date = new Date()): Date {
  // Start of last month
  const lastMonth = subMonths(now, 1);
  return startOfMonth(lastMonth);
}

/**
 * Get the maximum allowed date for BASE (free) users.
 * BASE users can only see up to end of current month.
 */
export function getFreeHistoryEndDate(now: Date = new Date()): Date {
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return endOfCurrentMonth;
}

export function enforceHistoryWindow(
  requestedRange: DateRangeValue,
  isPremium: boolean,
  now: Date = new Date()
): { range: DateRangeValue; wasClamped: boolean } {
  // PRO users get full access
  if (isPremium) {
    return { range: requestedRange, wasClamped: false };
  }

  const minDate = getFreeHistoryStartDate(now);
  const maxDate = getFreeHistoryEndDate(now);
  const requestedFrom = requestedRange.from;
  const requestedTo = requestedRange.to;

  // Clamp from date to minimum allowed
  const clampedFrom = isAfter(minDate, requestedFrom) ? minDate : requestedFrom;
  // Clamp to date to maximum allowed
  const clampedTo = isAfter(requestedTo, maxDate) ? maxDate : requestedTo;

  return {
    range: { from: clampedFrom, to: clampedTo },
    wasClamped:
      clampedFrom.getTime() !== requestedFrom.getTime() ||
      clampedTo.getTime() !== requestedTo.getTime(),
  };
}

export function enforceHistoryWindowForFilters(
  dateFrom: string,
  dateTo: string,
  isPremium: boolean,
  now: Date = new Date()
): { dateFrom: string; dateTo: string; wasClamped: boolean } {
  // PRO users get full access
  if (isPremium) {
    return { dateFrom, dateTo, wasClamped: false };
  }

  const minDate = getFreeHistoryStartDate(now);
  const maxDate = getFreeHistoryEndDate(now);
  const minDateStr = format(minDate, 'yyyy-MM-dd');
  const maxDateStr = format(maxDate, 'yyyy-MM-dd');

  // Clamp from date to minimum allowed
  const nextFrom = dateFrom < minDateStr ? minDateStr : dateFrom;
  // Clamp to date to maximum allowed
  const nextTo = dateTo > maxDateStr ? maxDateStr : dateTo;

  return {
    dateFrom: nextFrom,
    dateTo: nextTo,
    wasClamped: nextFrom !== dateFrom || nextTo !== dateTo,
  };
}
