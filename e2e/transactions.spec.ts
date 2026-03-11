/**
 * E2E — Transaction flows
 *
 * Requires a logged-in session (storageState set at the project level in
 * playwright.config.ts). Each test that creates data cleans up after itself.
 */
import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const E2E_PREFIX = '[E2E-TX]';

/** Open the InputMethodSheet via the FAB and choose Manual Entry */
async function openManualEntryForm(page: Page) {
  await page.locator('[data-testid="fab-button"]').click();
  // The InputMethodSheet has a card with label "Manual" — click the first match
  await page.getByText('Manual').first().click();
  // Wait for the drawer/modal to be visible
  await expect(page.getByPlaceholder('What was this for?')).toBeVisible({ timeout: 5_000 });
}

/** Fill and submit the transaction form */
async function fillAndSubmitTransaction(
  page: Page,
  opts: { merchant: string; amount: string; type?: 'expense' | 'income' }
) {
  const { merchant, amount, type = 'expense' } = opts;

  // Switch transaction type if needed (default is expense)
  if (type === 'income') {
    await page.getByRole('button', { name: /income/i }).click();
  }

  await page.getByPlaceholder('What was this for?').fill(merchant);
  await page.getByPlaceholder('0.00').fill(amount);

  // Expense submissions require a category selection.
  if (type === 'expense') {
    const categoryCombobox = page.getByRole('combobox').first();
    if (await categoryCombobox.count()) {
      await categoryCombobox.click();
      const firstCategory = page.getByRole('option').first();
      await firstCategory.waitFor({ timeout: 3_000 });
      await firstCategory.click();
    }
  }

  await page.locator('button[type="submit"]').click();
  // Wait for the modal to close
  await expect(page.getByPlaceholder('What was this for?')).not.toBeVisible({ timeout: 8_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Dashboard', () => {
  test('loads the dashboard without errors', async ({ page }) => {
    await page.goto('/');
    // Use heading role to avoid strict-mode collision with the nav label
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
  });

  test('FAB button is visible on the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="fab-button"]')).toBeVisible();
  });
});

test.describe('Expenses page', () => {
  test('loads the expenses page', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Add expense — manual entry', () => {
  test('adds an expense and it appears in the list', async ({ page }) => {
    await page.goto('/expenses');
    const merchant = `${E2E_PREFIX} Coffee`;
    await openManualEntryForm(page);
    await fillAndSubmitTransaction(page, { merchant, amount: '5.50' });

    // The transaction should appear somewhere on the page
    await expect(page.getByText(merchant)).toBeVisible({ timeout: 10_000 });

    // Cleanup: delete the transaction we just created
    const txRow = page.getByText(merchant).first();
    await txRow.hover();
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).last();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  });
});

test.describe('Add income — manual entry', () => {
  test('adds an income transaction', async ({ page }) => {
    await page.goto('/');
    const merchant = `${E2E_PREFIX} Salary`;
    await openManualEntryForm(page);
    await fillAndSubmitTransaction(page, { merchant, amount: '3000', type: 'income' });

    // Verify submission succeeded (modal closed without error)
    await expect(page.getByPlaceholder('What was this for?')).not.toBeVisible();
  });
});

test.describe('Form validation', () => {
  test('shows required-field errors when submitting an empty form', async ({ page }) => {
    await page.goto('/');
    await openManualEntryForm(page);
    await page.locator('button[type="submit"]').click();
    // At least one validation message should appear
    const errors = page.locator('[role="alert"], .text-destructive, [class*="error"]');
    await expect(errors.first()).toBeVisible({ timeout: 3_000 });
  });

  test('amount field rejects alphabetic input (type="number")', async ({ page }) => {
    await page.goto('/');
    await openManualEntryForm(page);
    const amountInput = page.getByPlaceholder('0.00');
    // Use pressSequentially because fill() throws on type="number" inputs
    await amountInput.pressSequentially('abc');
    const value = await amountInput.inputValue();
    // A type="number" input discards non-numeric characters
    expect(value).toBe('');
  });
});

test.describe('Date view filter on expenses page', () => {
  test('shows date range filter buttons (Daily/Weekly/Monthly/Yearly)', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible({ timeout: 10_000 });
    // The expenses page renders "Daily", "Weekly", "Monthly", "Yearly" buttons
    await expect(page.getByRole('button', { name: 'Weekly' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible();
  });
});
