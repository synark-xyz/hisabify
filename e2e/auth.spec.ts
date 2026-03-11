/**
 * E2E — Authentication flows
 *
 * These tests deliberately run WITHOUT the pre-saved storageState so that
 * the login/logout experience can be exercised from scratch.
 */
import { test, expect } from '@playwright/test';

// Override the project-level storageState for this spec file
test.use({ storageState: { cookies: [], origins: [] } });

// Pre-seed localStorage so AuthRoute does not redirect to /onboarding
// and the SplashScreen is skipped (see App.tsx e2e_skip_splash check).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('e2e_skip_splash', 'true');
  });
});

const PROTECTED_ROUTES = ['/', '/expenses', '/budget', '/savings', '/analytics'];

test.describe('Unauthenticated access', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`redirects ${route} to /auth when not logged in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth/);
    });
  }

  test('shows the Hisabify heading on the auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText('Hisabify')).toBeVisible();
  });

  test('shows Sign In and Sign Up tabs', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: 'Sign In' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' }).first()).toBeVisible();
  });
});

test.describe('Login flow', () => {
  test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await page.locator('#email').fill(process.env.E2E_REGULAR_EMAIL!);
    await page.locator('#password').fill(process.env.E2E_REGULAR_PASSWORD!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(|onboarding)$/, { timeout: 15_000 });
  });

  test('shows an error toast for wrong password', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await page.locator('#email').fill(process.env.E2E_REGULAR_EMAIL!);
    await page.locator('#password').fill('WrongPassword999!');
    await page.locator('button[type="submit"]').click();
    // Toast with error title or inline error message
    const errorLocator = page.locator('[role="alert"], .destructive').first();
    await expect(errorLocator).toBeVisible({ timeout: 8_000 });
  });

  test('blocks submission when email format is invalid', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await page.locator('#email').fill('not-an-email');
    await page.locator('#password').fill('somepassword');
    await page.locator('button[type="submit"]').click();
    // Either browser HTML5 validation or Zod prevents submission.
    // The reliable assertion is that the URL stays at /auth.
    await page.waitForTimeout(500);
    await expect(page).toHaveURL('/auth');
  });

  test('shows password validation error for too-short password', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await page.locator('#email').fill(process.env.E2E_REGULAR_EMAIL!);
    await page.locator('#password').fill('12345'); // fewer than 6 chars
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/at least 6 characters/i)).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Forgot password flow', () => {
  test('navigates to the forgot-password form and shows the reset link field', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByText(/Forgot Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible();
  });
});

test.describe('Already-authenticated redirect', () => {
  test.use({
    storageState: 'e2e/.auth/regular-user.json',
  });

  test('redirects away from /auth when the user is already logged in', async ({ page }) => {
    await page.goto('/auth');
    // Should be pushed to the dashboard because user is already authenticated
    await expect(page).not.toHaveURL('/auth', { timeout: 5_000 });
  });
});

test.describe('Logout flow', () => {
  test.use({
    storageState: 'e2e/.auth/regular-user.json',
  });

  test('clears the session and redirects to /auth after logout', async ({ page }) => {
    // Settings page has the "Sign Out" button
    await page.goto('/settings');
    await expect(page.getByText('Sign Out')).toBeVisible({ timeout: 8_000 });
    await page.getByText('Sign Out').click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });
});
