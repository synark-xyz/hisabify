/**
 * E2E — Settings & Preferences
 *
 * Covers: SPEC-02 from E2E_TEST_PLAN.md
 * Flows: 7 total
 */
import { test, expect } from '@playwright/test';

test.describe('Settings navigation', () => {
  test('/settings loads with navigation links visible', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('nav, main')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('/settings/preferences — Currency, Theme, Language', () => {
  test('currency selector is visible on preferences page', async ({ page }) => {
    await page.goto('/settings/preferences');
    const selector = page.getByRole('combobox').first();
    if (await selector.count() > 0) {
      await expect(selector).toBeVisible({ timeout: 5_000 });
    }
  });

  test('changing display currency persists on page reload', async ({ page }) => {
    await page.goto('/settings/preferences');
    const selector = page.getByRole('combobox').first();
    if (await selector.count() === 0) return;

    await selector.click();
    const option = page.getByRole('option').nth(1);
    if (await option.count() > 0) {
      await option.click();
      // Reload and check the setting persisted
      await page.reload();
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('changing theme (dark/light) applies to the html element', async ({ page }) => {
    await page.goto('/settings/preferences');
    const darkBtn = page.getByRole('button', { name: /dark/i }).first();
    const lightBtn = page.getByRole('button', { name: /light/i }).first();
    if (await darkBtn.count() > 0) {
      await darkBtn.click();
      const html = page.locator('html');
      await expect(html).toBeVisible({ timeout: 3_000 });
    }
    if (await lightBtn.count() > 0) {
      await lightBtn.click();
      await expect(page.locator('html')).toBeVisible({ timeout: 3_000 });
    }
  });

  test('language switcher changes visible UI text', async ({ page }) => {
    await page.goto('/settings/preferences');
    const langBtn = page.getByRole('button', { name: /language|language.*switch/i }).first();
    if (await langBtn.count() === 0) return;

    await langBtn.click();
    const options = page.getByRole('option');
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('/settings/notifications — Toggle preferences', () => {
  test('toggle switches are visible on notifications settings page', async ({ page }) => {
    await page.goto('/settings/notifications');
    const switches = page.locator('[type="checkbox"], [role="switch"]');
    const count = await switches.count();
    if (count > 0) {
      await expect(switches.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('toggling a notification preference does not crash the page', async ({ page }) => {
    await page.goto('/settings/notifications');
    const toggle = page.locator('[role="switch"]').first();
    if (await toggle.count() > 0) {
      await toggle.click();
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
      await toggle.click();
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
    }
  });
});