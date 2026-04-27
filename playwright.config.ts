import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Load .env.test for local runs (CI uses GitHub Actions secrets directly)
loadEnv({ path: '.env.test', override: false });

const isCI = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL ?? (isCI ? 'http://localhost:4173' : 'http://localhost:8080');

export default defineConfig({
  testDir: './e2e',
  // Only pick up *.spec.ts files — exclude the global-setup and fixtures
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // Global setup runs once before all tests: logs in and saves storageState
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL,
    // Default auth state for all tests (overridden in auth.spec.ts)
    storageState: 'e2e/.auth/regular-user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: isCI ? 'npm run preview' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
  },
});
