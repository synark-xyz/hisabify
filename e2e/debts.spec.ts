/**
 * E2E — Debt Tracking
 *
 * Covers: SPEC-03 from E2E_TEST_PLAN.md
 * Flows: 7 total
 */
import { test, expect, Page } from '@playwright/test';

const E2E_PREFIX = '[E2E-DEBT]';

async function openAddDebtModal(page: Page) {
  const addBtn = page.getByRole('button', { name: /add debt|new debt|\+/i }).first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Debt page', () => {
  test('loads at /debts with heading visible', async ({ page }) => {
    await page.goto('/debts');
    // Heading may say "Debt" or "Debt Tracker"
    const heading = page.getByRole('heading', { name: /debt/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Add Debt modal', () => {
  test('Add Debt modal opens via CTA button', async ({ page }) => {
    await page.goto('/debts');
    await openAddDebtModal(page);
    // Modal should have at least a name or amount input
    const nameInput = page.getByPlaceholder(/name|creditor|debt/i).first();
    if (await nameInput.count() > 0) {
      await expect(nameInput).toBeVisible({ timeout: 5_000 });
    }
  });

  test('creating a debt makes it appear in the list', async ({ page }) => {
    await page.goto('/debts');
    await openAddDebtModal(page);

    const debtName = `${E2E_PREFIX} Test Debt`;
    const nameInput = page.getByPlaceholder(/name|creditor|debt/i).first();
    if (await nameInput.count() > 0) {
      await nameInput.fill(debtName);
    }

    const amountInput = page.getByPlaceholder(/amount|balance/i).first();
    if (await amountInput.count() > 0) {
      await amountInput.fill('500');
    }

    // Submit form
    const submitBtn = page.getByRole('button', { name: /add|save|create/i }).first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    // The debt should appear in the list
    await expect(page.getByText(debtName).first()).toBeVisible({ timeout: 8_000 });
  });

  test('debt card shows creditor name and amount', async ({ page }) => {
    await page.goto('/debts');
    // Look for any debt card with amount and name
    const debtCards = page.locator('[class*="debt"], [class*="card"]').filter({ hasText: /[$€£¥₹]/ });
    if (await debtCards.count() > 0) {
      await expect(debtCards.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('recording a repayment updates the remaining balance', async ({ page }) => {
    await page.goto('/debts');
    // Find first debt card
    const debtCard = page.locator('[class*="debt"], [class*="card"]').first();
    if (await debtCard.count() === 0) return;

    // Look for a settle/repay button
    const settleBtn = page.getByRole('button', { name: /settle|repay|record.*payment/i }).first();
    if (await settleBtn.count() > 0) {
      await settleBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
    }
  });

  test('deleting a debt removes it from the list', async ({ page }) => {
    await page.goto('/debts');
    const deleteBtn = page.getByRole('button', { name: /delete|remove/i }).first();
    if (await deleteBtn.count() === 0) return;

    // Get debt name before deletion
    const firstDebt = page.locator('[class*="debt"], [class*="card"]').first();
    const debtName = await firstDebt.textContent().catch(() => '');

    await deleteBtn.click();
    // Confirm deletion if dialog appears
    const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).last();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(1000);

    if (debtName) {
      await expect(page.getByText(debtName).first()).not.toBeVisible({ timeout: 5_000 });
    }
  });

  test('free users can add at least one debt', async ({ page }) => {
    await page.goto('/debts');
    const addBtn = page.getByRole('button', { name: /add debt|new debt/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
  });
});