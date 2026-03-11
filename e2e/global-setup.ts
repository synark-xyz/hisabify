/**
 * Playwright Global Setup
 *
 * Runs once before the test suite. Logs in as the regular test user and
 * saves the authenticated browser storage state so individual specs can
 * skip the login step entirely.
 *
 * Two localStorage keys are pre-seeded via addInitScript:
 *   - hasSeenOnboarding  → prevents AuthRoute from redirecting to /onboarding
 *   - e2e_skip_splash    → bypasses the SplashScreen (see App.tsx useState check)
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = 'e2e/.auth/regular-user.json';

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
  const email = process.env.E2E_REGULAR_EMAIL;
  const password = process.env.E2E_REGULAR_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_REGULAR_EMAIL and E2E_REGULAR_PASSWORD must be set.\n' +
      'Copy .env.test.example → .env.test and fill in the credentials.'
    );
  }

  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Inject localStorage keys BEFORE any page script runs.
  // This ensures:
  //  1. AuthRoute sees hasSeenOnboarding and does NOT redirect to /onboarding
  //  2. AppRoutes skips the SplashScreen animation
  await context.addInitScript(() => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('e2e_skip_splash', 'true');
  });

  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/auth`);

    // Wait for the login form inputs (splash is skipped, no onboarding redirect)
    await page.waitForSelector('#email', { timeout: 15_000 });

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/$/, { timeout: 20_000 });

    // Ensure the test-only keys persist into the saved auth state so that
    // every spec using this storageState also benefits from them.
    await page.evaluate(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('e2e_skip_splash', 'true');
    });

    await context.storageState({ path: AUTH_FILE });
    console.log(`[global-setup] Auth state saved → ${AUTH_FILE}`);
  } finally {
    await context.close();
    await browser.close();
  }
}
