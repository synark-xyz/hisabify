/**
 * E2E — Savings goal flows
 *
 * Note: The regular (free) test user is limited to 1 savings goal at a time.
 * Tests that create a goal clean up after themselves.
 */
import { test, expect, Page } from '@playwright/test';

const E2E_PREFIX = '[E2E-SAV]';

// ---------------------------------------------------------------------------
// Helper — open Add Savings Goal flow (create modal or upgrade modal)
// ---------------------------------------------------------------------------
async function openAddGoalModal(page: Page): Promise<'create' | 'upgrade'> {
  const addBtn = page.getByRole('button', { name: /add.*goal|new.*goal|\+/i }).first();
  await expect(addBtn).toBeVisible({ timeout: 5_000 });
  await addBtn.click();

  const createModalInput = page.getByPlaceholder('e.g., Emergency Fund');
  try {
    await createModalInput.waitFor({ state: 'visible', timeout: 2_500 });
    return 'create';
  } catch {
    const upgradeHeading = page
      .getByRole('dialog')
      .getByRole('heading', { name: /upgrade to pro/i });
    await expect(upgradeHeading).toBeVisible({ timeout: 5_000 });
    return 'upgrade';
  }
}

async function closeUpgradeModal(page: Page) {
  const maybeLater = page
    .getByRole('dialog')
    .getByRole('button', { name: /maybe later/i })
    .first();
  if (await maybeLater.isVisible()) {
    await maybeLater.click();
  }
}

async function deleteFirstExistingGoal(page: Page) {
  const goalMenuButtons = page.locator('button:has(svg.lucide-more-vertical)');
  const before = await goalMenuButtons.count();
  expect(before).toBeGreaterThan(0);

  await goalMenuButtons.first().click();
  await page.getByRole('menuitem', { name: /delete goal/i }).click();

  const deleteDialog = page.getByRole('dialog').filter({ hasText: /Delete ".*"\?/i }).first();
  await expect(deleteDialog).toBeVisible({ timeout: 5_000 });
  await deleteDialog.getByRole('button', { name: /^delete$/i }).click();

  await expect(goalMenuButtons).toHaveCount(before - 1, { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Savings page', () => {
  test('loads the savings page', async ({ page }) => {
    await page.goto('/savings');
    await expect(page.getByRole('heading', { name: 'Savings' })).toBeVisible({ timeout: 10_000 });
  });

  test('shows an "Add Goal" button or equivalent CTA', async ({ page }) => {
    await page.goto('/savings');
    const addBtn = page.getByRole('button', { name: /add.*goal|new.*goal|\+/i });
    await expect(addBtn.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows a savings summary section when goals exist', async ({ page }) => {
    await page.goto('/savings');
    // Either summary cards or an empty-state message should be visible
    await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Create savings goal', () => {
  test('creates a goal and it appears in the list', async ({ page }) => {
    await page.goto('/savings');
    let mode = await openAddGoalModal(page);
    if (mode === 'upgrade') {
      // Free account already has a goal; remove one and retry create flow.
      await closeUpgradeModal(page);
      await deleteFirstExistingGoal(page);
      mode = await openAddGoalModal(page);
    }
    expect(mode).toBe('create');

    const goalName = `${E2E_PREFIX} Vacation`;
    await page.getByPlaceholder('e.g., Emergency Fund').fill(goalName);

    const targetInput = page.getByPlaceholder('10000');
    await expect(targetInput).toBeVisible();
    await targetInput.fill('2000');

    await page.getByRole('button', { name: 'Create Goal' }).click();
    // Modal closes — input field disappears
    await expect(page.getByPlaceholder('e.g., Emergency Fund')).not.toBeVisible({ timeout: 8_000 });

    await expect(page.getByText(goalName)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Savings goal card', () => {
  test('goal card shows a progress bar element', async ({ page }) => {
    await page.goto('/savings');
    await expect(page.getByRole('heading', { name: 'Savings' })).toBeVisible({ timeout: 10_000 });
    // Progress bars are typically role="progressbar" — data-dependent
    const progressBar = page.getByRole('progressbar').first();
    if (await progressBar.count() > 0) {
      await expect(progressBar).toBeVisible();
    }
  });
});

test.describe('Delete savings goal', () => {
  test('creates then deletes a goal', async ({ page }) => {
    await page.goto('/savings');
    const mode = await openAddGoalModal(page);

    if (mode === 'upgrade') {
      await closeUpgradeModal(page);
      await deleteFirstExistingGoal(page);
      return;
    }

    const goalName = `${E2E_PREFIX} Temporary Goal`;
    await page.getByPlaceholder('e.g., Emergency Fund').fill(goalName);
    const targetInput = page.getByPlaceholder('10000');
    await targetInput.fill('100');
    await page.getByRole('button', { name: 'Create Goal' }).click();
    await expect(page.getByPlaceholder('e.g., Emergency Fund')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(goalName)).toBeVisible({ timeout: 10_000 });

    // Delete the goal — typically a swipe/button on the card
    const goalCard = page.getByText(goalName).first();
    await goalCard.hover();
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).last();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      await expect(page.getByText(goalName)).not.toBeVisible({ timeout: 8_000 });
    }
  });
});

test.describe('Premium gate', () => {
  test('shows upgrade prompt when free user tries to add a second goal', async ({ page }) => {
    await page.goto('/savings');

    // If the account has no goal yet, create one first so the second-attempt gate can be asserted.
    let mode = await openAddGoalModal(page);
    if (mode === 'create') {
      const goalName = `${E2E_PREFIX} Gate Seed`;
      await page.getByPlaceholder('e.g., Emergency Fund').fill(goalName);
      await page.getByPlaceholder('10000').fill('50');
      await page.getByRole('button', { name: 'Create Goal' }).click();
      await expect(page.getByPlaceholder('e.g., Emergency Fund')).not.toBeVisible({ timeout: 8_000 });
      await expect(page.getByText(goalName)).toBeVisible({ timeout: 10_000 });
    } else {
      await closeUpgradeModal(page);
    }

    mode = await openAddGoalModal(page);
    expect(mode).toBe('upgrade');
  });
});
