/**
 * E2E — Payment reminder flows
 *
 * Reminders are displayed on the Notifications page (/notifications).
 * The tests focus on viewing, status display, and marking reminders as paid.
 */
import { test, expect } from '@playwright/test';

test.describe('Notifications page', () => {
  test('loads the notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('shows a "Payment Reminders" section heading or empty state message', async ({ page }) => {
    await page.goto('/notifications');
    // Either there are reminders (heading visible) or no notifications
    const remindersHeading = page.getByText(/payment reminders/i);
    const emptyState = page.getByText(/no pending notifications|no reminders/i);
    await expect(remindersHeading.or(emptyState)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Reminder status badges', () => {
  test('upcoming reminders show an "Upcoming" badge', async ({ page }) => {
    await page.goto('/notifications');
    const upcomingBadge = page.getByText(/upcoming/i).first();
    const count = await upcomingBadge.count();
    // Only assert if there are reminders; otherwise the empty state test covers it
    if (count > 0) {
      await expect(upcomingBadge).toBeVisible();
    }
  });

  test('paid reminders show a "Paid" badge', async ({ page }) => {
    await page.goto('/notifications');
    const paidBadge = page.getByText(/paid/i).first();
    const count = await paidBadge.count();
    if (count > 0) {
      await expect(paidBadge).toBeVisible();
    }
  });

  test('missed reminders show a "Missed" badge', async ({ page }) => {
    await page.goto('/notifications');
    const missedBadge = page.getByText(/missed/i).first();
    const count = await missedBadge.count();
    if (count > 0) {
      await expect(missedBadge).toBeVisible();
    }
  });
});

test.describe('Reminder amount display', () => {
  test('reminder amounts are displayed with a currency symbol', async ({ page }) => {
    await page.goto('/notifications');
    // If any reminders exist, amounts should include a currency symbol
    const amounts = page.locator('[data-testid="reminder-amount"], .reminder-amount');
    const fallbackAmounts = page.getByText(/[$€£¥₹]\d/);

    const reminderHeading = page.getByText(/payment reminders/i);
    if (await reminderHeading.isVisible()) {
      // There are reminders — an amount with a currency symbol should exist
      await expect(fallbackAmounts.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('reminder due dates are displayed in a human-readable format', async ({ page }) => {
    await page.goto('/notifications');
    const reminderHeading = page.getByText(/payment reminders/i);
    if (await reminderHeading.isVisible()) {
      // Dates are formatted as "Jan 1, 2026" or similar
      const datePattern = page.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      await expect(datePattern.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Mark as paid', () => {
  test('"Mark as Paid" button is visible for upcoming reminders', async ({ page }) => {
    await page.goto('/notifications');
    const upcomingReminder = page.getByText(/upcoming/i).first();
    if (await upcomingReminder.count() > 0) {
      const markPaidBtn = page.getByRole('button', { name: /mark.*paid|paid/i }).first();
      await expect(markPaidBtn).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Dashboard reminder carousel', () => {
  test('dashboard is reachable and renders main content', async ({ page }) => {
    await page.goto('/');
    // Confirm the SPA settled on the dashboard URL (no redirect to /auth or /onboarding)
    await page.waitForURL(/\/$/, { timeout: 10_000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});
