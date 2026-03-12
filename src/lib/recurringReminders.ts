import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { toReminderDisplayDate, toReminderDueDateIso } from './reminderDate';

/**
 * Calculate the next due date for a recurring reminder
 * Uses reminderDate utilities to avoid timezone issues
 *
 * @param currentDueDate - ISO string of current due date
 * @param interval - Recurring interval (daily, weekly, monthly, yearly)
 * @returns ISO string of next due date
 */
export function calculateNextDueDate(
  currentDueDate: string,
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  // Convert to local date (calendar day)
  const currentDate = toReminderDisplayDate(currentDueDate);

  // Calculate next occurrence based on interval
  let nextDate: Date;
  switch (interval) {
    case 'daily':
      nextDate = addDays(currentDate, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(currentDate, 1);
      break;
    case 'monthly':
      nextDate = addMonths(currentDate, 1);
      break;
    case 'yearly':
      nextDate = addYears(currentDate, 1);
      break;
    default:
      throw new Error(`Invalid recurring interval: ${interval}`);
  }

  // Convert back to YYYY-MM-DD format, then to ISO with UTC noon
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  return toReminderDueDateIso(dateString);
}
