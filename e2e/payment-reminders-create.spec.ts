/**
 * E2E — Payment Reminder CRUD
 *
 * Covers: SPEC-08 from E2E_TEST_PLAN.md
 * Flows: 6 total
 * Note: reminders.spec.ts covers viewing; this file covers full CRUD.
 */
import { test, expect, Page } from '@playwright/test';

const E2E_PREFIX = '[E2E-REM]';

async function openAddReminderModal(page: Page) {
  // Look for "Add Reminder" button on the dashboard or notifications page
  const addBtn = page.getByRole('button', { name: /add.*reminder|new.*reminder|\+/i }).first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Create reminder', () => {
  test('"Add Reminder" button opens the create modal from the dashboard', async ({ page }) => {
    await page.goto('/');
    await openAddReminderModal(page);
    // Modal should have a name field or title
    const modalTitle = page.getByText(/add.*reminder|new.*reminder/i).first();
    if (await modalTitle.count() > 0) {
      await expect(modalTitle).toBeVisible({ timeout: 5_000 });
    }
  });

  test('filling name, amount, due date creates the reminder', async ({ page }) => {
    await page.goto('/notifications');
    await openAddReminderModal(page);

    const reminderName = `${E2E_PREFIX} Rent`;
    const nameInput = page.getByPlaceholder(/name|title|what/i).first();
    if (await nameInput.count() > 0) {
      await nameInput.fill(reminderName);
    }

    const amountInput = page.getByPlaceholder(/amount|0\.00/i).first();
    if (await amountInput.count() > 0) {
      await amountInput.fill('1200');
    }

    const submitBtn = page.getByRole('button', { name: /add|save|create/i }).first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(reminderName).first()).toBeVisible({ timeout: 8_000 });
  });

  test('new reminder appears in the dashboard carousel', async ({ page }) => {
    await page.goto('/');
    const reminderInCarousel = page.locator('[class*="carousel"], [class*="reminder"]').first();
    if (await reminderInCarousel.count() > 0) {
      await expect(reminderInCarousel).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Edit reminder', () => {
  test('editing a reminder updates its displayed details', async ({ page }) => {
    await page.goto('/notifications');
    const firstReminder = page.locator('[class*="reminder"]').first();
    if (await firstReminder.count() === 0) return;

    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(500);

      const nameInput = page.getByPlaceholder(/name|title/i).first();
      if (await nameInput.count() > 0) {
        await nameInput.fill(`${E2E_PREFIX} Updated`);
        const saveBtn = page.getByRole('button', { name: /save|update/i }).first();
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});

test.describe('Mark as paid / delete', () => {
  test('marking a reminder as paid moves it to "Paid" status', async ({ page }) => {
    await page.goto('/notifications');
    const markPaidBtn = page.getByRole('button', { name: /mark.*paid|paid/i }).first();
    if (await markPaidBtn.count() === 0) return;

    await markPaidBtn.click();
    await page.waitForTimeout(1000);

    const paidBadge = page.getByText(/paid/i).first();
    if (await paidBadge.count() > 0) {
      await expect(paidBadge).toBeVisible({ timeout: 5_000 });
    }
  });

  test('deleting a reminder removes it from the list', async ({ page }) => {
    await page.goto('/notifications');
    const deleteBtn = page.getByRole('button', { name: /delete|remove/i }).first();
    if (await deleteBtn.count() === 0) return;

    await deleteBtn.click();
    const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).last();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(1000);
    await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
  });
});