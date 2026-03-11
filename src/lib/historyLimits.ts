import { format, subDays, startOfDay, isAfter } from 'date-fns';
import { FREE_HISTORY_DAYS } from '@/lib/entitlements';

export interface DateRangeValue {
  from: Date;
  to: Date;
}

export function getFreeHistoryStartDate(now: Date = new Date()): Date {
  return startOfDay(subDays(now, FREE_HISTORY_DAYS));
}

export function enforceHistoryWindow(
  requestedRange: DateRangeValue,
  isPremium: boolean,
  now: Date = new Date()
): { range: DateRangeValue; wasClamped: boolean } {
  if (isPremium) {
    return { range: requestedRange, wasClamped: false };
  }

  const minDate = getFreeHistoryStartDate(now);
  const requestedFrom = requestedRange.from;
  const requestedTo = requestedRange.to;

  const clampedFrom = isAfter(minDate, requestedFrom) ? minDate : requestedFrom;
  const clampedTo = isAfter(minDate, requestedTo) ? minDate : requestedTo;

  return {
    range: { from: clampedFrom, to: clampedTo },
    wasClamped: clampedFrom.getTime() !== requestedFrom.getTime() || clampedTo.getTime() !== requestedTo.getTime(),
  };
}

export function enforceHistoryWindowForFilters(
  dateFrom: string,
  dateTo: string,
  isPremium: boolean,
  now: Date = new Date()
): { dateFrom: string; dateTo: string; wasClamped: boolean } {
  if (isPremium) {
    return { dateFrom, dateTo, wasClamped: false };
  }

  const minDate = getFreeHistoryStartDate(now);
  const minDateStr = format(minDate, 'yyyy-MM-dd');
  const nextFrom = dateFrom < minDateStr ? minDateStr : dateFrom;
  const nextTo = dateTo < minDateStr ? minDateStr : dateTo;

  return {
    dateFrom: nextFrom,
    dateTo: nextTo,
    wasClamped: nextFrom !== dateFrom || nextTo !== dateTo,
  };
}
