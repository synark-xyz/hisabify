/**
 * Auth helpers for E2E specs.
 *
 * Most tests use the pre-saved storageState (regular-user.json) configured
 * in playwright.config.ts. Use `loginAs` only when a test needs to switch
 * users mid-spec or verify the login flow itself.
 */
import { Page } from '@playwright/test';

export type UserRole = 'regular' | 'pro';

interface Credentials {
  email: string;
  password: string;
}

function getCredentials(role: UserRole): Credentials {
  if (role === 'pro') {
    const email = process.env.E2E_PRO_EMAIL;
    const password = process.env.E2E_PRO_PASSWORD;
    if (!email || !password) throw new Error('E2E_PRO_EMAIL / E2E_PRO_PASSWORD not set');
    return { email, password };
  }
  const email = process.env.E2E_REGULAR_EMAIL;
  const password = process.env.E2E_REGULAR_PASSWORD;
  if (!email || !password) throw new Error('E2E_REGULAR_EMAIL / E2E_REGULAR_PASSWORD not set');
  return { email, password };
}

/** Perform a full browser login and wait for the dashboard URL. */
export async function loginAs(page: Page, role: UserRole = 'regular'): Promise<void> {
  const { email, password } = getCredentials(role);
  await page.goto('/auth', { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(|onboarding)$/, { timeout: 15_000 });
}

/** Navigate to /auth and verify the page is accessible (no session). */
export async function expectAuthPage(page: Page): Promise<void> {
  await page.goto('/auth');
  await page.waitForURL('/auth');
}
