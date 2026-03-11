/**
 * Treat reminder due dates as calendar-day values to avoid timezone drift.
 */

export function toReminderDueDateIso(dateInput: string): string {
  const [year, month, day] = dateInput.split('-').map(Number);
  // Store at UTC noon to avoid crossing date boundaries in most timezones.
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

export function toReminderDateInputValue(isoDate: string): string {
  return new Date(isoDate).toISOString().slice(0, 10);
}

export function toReminderDisplayDate(isoDate: string): Date {
  const datePart = new Date(isoDate).toISOString().slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}
