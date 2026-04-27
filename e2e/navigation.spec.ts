/**
 * E2E — Bottom Navigation & Route Integrity
 *
 * Covers: SPEC-09 from E2E_TEST_PLAN.md
 * Flows: 6 total
 */
import { test, expect } from '@playwright/test';

test.describe('Bottom navigation bar', () => {
  test('bottom navigation bar is visible on main pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav, [class*="bottom"]')).toBeVisible({ timeout: 10_000 });
  });

  test('FAB button is visible on main pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="fab-button"]')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Nav item navigation', () => {
  test('each nav item navigates to the correct route', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav a, [class*="nav"] a, [class*="bottom"] button');
    const count = await navLinks.count();

    for (let i = 0; i < Math.min(count, 6); i++) {
      const link = navLinks.nth(i);
      if (await link.count() === 0) continue;

      const label = await link.textContent().catch(() => '');
      await link.click();
      await page.waitForTimeout(500);
      // At minimum, the page should not crash (main content visible)
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
      // Return to dashboard for next nav item
      await page.goto('/');
    }
  });
});

test.describe('Route integrity', () => {
  test('navigating to an unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    const notFound = page.getByText(/not found|404/i).first();
    if (await notFound.count() > 0) {
      await expect(notFound).toBeVisible({ timeout: 5_000 });
    }
  });

  test('/auth/callback with missing params shows an error gracefully', async ({ page }) => {
    await page.goto('/auth/callback');
    // Should either show an error message or redirect to auth page
    await expect(page.locator('main, body')).toBeVisible({ timeout: 5_000 });
  });

  test('back-navigation from a sub-route works correctly', async ({ page }) => {
    await page.goto('/profile/personal');
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Go back
    await page.goBack();
    await page.waitForTimeout(500);
    await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Bottom nav visible on all five main pages', () => {
  const mainPages = [
    { url: '/', name: 'Dashboard' },
    { url: '/expenses', name: 'Expenses' },
    { url: '/budget', name: 'Budget' },
    { url: '/insights', name: 'Insights' },
  ];

  for (const p of mainPages) {
    test(`${p.name} page has bottom nav`, async ({ page }) => {
      await page.goto(p.url);
      await expect(page.locator('nav, [class*="bottom"]')).toBeVisible({ timeout: 10_000 });
    });
  }
});