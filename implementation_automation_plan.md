# Automation QA Implementation Plan

**Project:** Hisabify
**Branch:** bugfix-expenses-data-sync
**Prepared:** 2026-03-11
**Status:** AWAITING APPROVAL

---

## 1. Scope of Automation

### In Scope

| Area | Rationale |
|------|-----------|
| Pure utility functions (`security.ts`, `transactionUtils.ts`, `transactionDateRange.ts`, `exchangeRateService.ts`, `reminderAmount.ts`) | Fast, deterministic, zero external deps — ideal for unit tests |
| Business logic hooks (`useBudgets`, `useBudgetContext`, `useVoiceInput`) | Already partially tested; gaps remain |
| Health Score calculation | Existing coverage; extended for edge cases |
| Recurring reminders date logic | Existing coverage; confirmed good |
| E2E critical user flows (auth, transactions, budgets, savings, reminders) | Business-critical regression paths |
| CI pipeline (GitHub Actions) | Enforces quality gate on every push/PR |

### Out of Scope (for this iteration)

- Visual regression / screenshot diffing
- Performance benchmarks
- Native Capacitor (Android/iOS) device testing
- OCR / receipt upload (requires real files + Tesseract)
- Voice input E2E (requires browser microphone access — impractical in CI)

---

## 2. Strategy & Tool Selection

### Unit + Integration Tests: **Vitest** (already configured)

- Already in `devDependencies`; zero new infrastructure
- `jsdom` environment already configured in `vite.config.ts`
- `@testing-library/react` already available for hook tests
- Add `@vitest/coverage-v8` for code coverage reports

### E2E Tests: **Playwright**

Rationale over Cypress:
- First-class TypeScript support
- True multi-browser (Chromium, Firefox, WebKit) with a single config
- Faster parallel execution
- Built-in network interception (critical for mocking Supabase calls in CI)
- Better mobile viewport emulation (important for this mobile-first app)

### CI: **GitHub Actions**

- Separate jobs: `lint` → `unit-tests` → `e2e`
- Unit tests run on every push; E2E only on PR to `main`
- Coverage report uploaded as artifact

---

## 3. Test Environment Requirements

### Unit Tests (no configuration needed)
- Run entirely in jsdom; no network or env vars required

### E2E Tests (requires your input — see Section 8)
- Playwright spins up `vite preview` (production build) or `vite dev`
- Needs a `.env.test` file with Supabase test credentials
- Needs a **test user** (email + password) pre-seeded in Supabase
- Optionally: a Supabase test project (separate from production)

---

## 4. File Delivery Plan

### 4.1 Package Changes (`package.json`)

```
devDependencies to add:
  @vitest/coverage-v8        (coverage reports)
  @playwright/test           (E2E framework)

scripts to add:
  "test:unit"     → "vitest run"
  "test:coverage" → "vitest run --coverage"
  "test:e2e"      → "playwright test"
  "test:e2e:ui"   → "playwright test --ui"
  "test:all"      → "npm run test:unit && npm run test:e2e"
```

### 4.2 Vitest Coverage Config (`vite.config.ts` — small addition)

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  include: ['src/lib/**', 'src/hooks/**', 'src/features/**'],
  exclude: ['src/integrations/**', 'src/components/ui/**'],
  thresholds: { lines: 7, functions: 6, branches: 6 },
}
```

### 4.3 New Unit Test Files

#### `src/lib/__tests__/security.test.ts` (~40 cases)

| Test Group | Cases |
|---|---|
| `sanitizeInput` | strips script tags, strips event handlers, strips `javascript:`, trims whitespace, truncates at 10,000 chars, handles non-string input |
| `isValidEmail` | valid email, missing @, missing domain, empty string, with subdomains |
| `validatePasswordStrength` | too short, no lowercase, no uppercase, no digit, valid strong password |
| `RateLimiter` | allows up to max attempts, blocks on exceeded, resets after window, `getResetTime` returns positive value |
| `sanitizeTransactionData` | forces positive amount, truncates merchant at 255, truncates note at 1000, null note passthrough |
| `sanitizeNumericInput` | NaN → 0, Infinity → 0, negative numbers, beyond MAX_SAFE_AMOUNT clamped |
| `secureCompare` | same strings, different strings, different lengths (early return) |
| `generateRandomString` | returns correct length, returns hex string, different each call |

#### `src/lib/__tests__/transactionUtils.test.ts` (~12 cases)

| Test Group | Cases |
|---|---|
| `getTransactionCategoryName` | returns category name, note `[credit_card]`, note `[utility]`, note `[lend]`, note `[owe]`, note `[custom]`, type `lend`, type `owe`, no match → 'Other' |
| `getTransactionCategoryColor` | returns category color, note-based colors, type-based colors, fallback gray |

#### `src/lib/__tests__/transactionDateRange.test.ts` (~10 cases)

| Test Group | Cases |
|---|---|
| `getViewRange('day')` | start = startOfDay, end = endOfDay |
| `getViewRange('week')` | week starts on Monday (weekStartsOn: 1) |
| `getViewRange('month')` | start = startOfMonth, end = endOfMonth |
| `getViewRange('year')` | start = startOfYear, end = endOfYear |
| unknown mode | falls back to month range |

#### `src/lib/__tests__/exchangeRateService.test.ts` (~12 cases)

| Test Group | Cases |
|---|---|
| `shouldUpdateRates` | returns true when no stored timestamp, returns false within 24h, returns true after 24h |
| `markRatesUpdated` | writes current timestamp to localStorage |
| `getTimeUntilNextUpdate` | returns 0 when no stored timestamp, positive value within window, 0 when overdue |
| `getLastUpdateTime` | returns null when no stored value, returns correct Date object |

#### `src/lib/__tests__/reminderAmount.test.ts` (~15 cases)

| Test Group | Cases |
|---|---|
| `formatReminderAmount` with `reminder.currency` | USD formats correctly, JPY has no decimals, KRW has no decimals, EUR with euro symbol |
| Legacy fallback via `note` — currency code `[USD]` | extracts code from note, formats correctly |
| Legacy fallback via `note` — currency symbol | extracts symbol from "Based on transaction: $50" |
| No currency anywhere | delegates to `fallbackFormatter` |
| Null/undefined amount | treats as 0 |
| Non-finite amount | treats as 0 |

### 4.4 Playwright E2E Tests

#### `playwright.config.ts`

```ts
baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080'
testDir: './e2e'
projects: [{ name: 'chromium' }]  // Chromium-only in CI; extend locally
reporter: ['list', ['html', { outputFolder: 'playwright-report' }]]
```

#### `e2e/fixtures/auth.ts`

Shared `test` fixture that logs in once per worker using `storageState`, so auth cookies are reused across tests — avoids re-logging-in on every spec.

#### `e2e/auth.spec.ts` (~8 cases)

| Case | Description |
|---|---|
| Redirect unauthenticated → /auth | Visiting `/` without session redirects to `/auth` |
| Login with valid credentials | Form submit → lands on dashboard |
| Login with wrong password | Shows error toast |
| Login with invalid email format | Shows inline validation error |
| Logout | Clicking logout → redirected to `/auth`, session cleared |
| Protected routes list | `/expenses`, `/budget`, `/savings` all redirect if unauthenticated |
| Password reset form | Enter email → success message shown |
| Already-authenticated → skip auth | Visiting `/auth` while logged in redirects to `/` |

#### `e2e/transactions.spec.ts` (~10 cases)

| Case | Description |
|---|---|
| Dashboard shows transaction list | At least one transaction row visible |
| Add expense — manual form | Open FAB → Manual Entry → fill form → submit → transaction appears |
| Add income | Type = income → saves correctly, balance reflects |
| Amount field rejects non-numeric | Entering letters does not break form |
| Date defaults to today | `date` field pre-populated with current date |
| Required field validation | Submit empty form shows required errors |
| Delete a transaction | Delete icon → confirm → transaction removed from list |
| Filter by date view (day/week/month/year) | Toggle tabs → list updates |
| Currency symbol matches user preference | Amount display uses selected currency |
| Expense with note | Note saved and displayed in detail view |

#### `e2e/budgets.spec.ts` (~8 cases)

| Case | Description |
|---|---|
| Budget page loads | Heading "Budget" visible |
| Create a monthly budget | Fill form → budget card appears |
| Budget shows correct status (safe) | Spending < 80% → "Safe" badge |
| Budget shows warning status | Spending 80–99% → "Warning" badge |
| Budget shows exceeded status | Spending ≥ 100% → "Exceeded" badge |
| Add transaction triggers budget warning dialog | Amount would exceed remaining → dialog appears |
| Budget period filter | Weekly/Monthly/Yearly toggle filters list |
| Delete budget | Delete → confirm → budget removed |

#### `e2e/savings.spec.ts` (~6 cases)

| Case | Description |
|---|---|
| Savings page loads | Heading visible, empty state or goals list |
| Create savings goal | Fill name, target amount, deadline → goal card appears |
| Goal shows progress percentage | Funded amount / target reflected on progress bar |
| Add funds to goal | Click "Add Funds" → amount → progress updates |
| Goal deadline display | Deadline date shown correctly |
| Delete savings goal | Delete → confirm → goal removed |

#### `e2e/reminders.spec.ts` (~6 cases)

| Case | Description |
|---|---|
| Notifications page loads | Reminder section visible |
| Create payment reminder | Fill title, amount, due date → reminder appears |
| Overdue reminder shows "Missed" badge | Due date in past → status = missed |
| Upcoming reminder shows correct badge | Future date → "Upcoming" badge |
| Mark reminder as paid | "Mark Paid" → status changes |
| Recurring reminder shows next due date | `is_recurring=true` → next date shown |

### 4.5 CI Pipeline (`.github/workflows/ci.yml`)

```
Triggers: push to any branch, pull_request to main

Jobs:
  lint:      npm run lint
  unit:      npm run test:coverage → upload coverage artifact
  e2e:       (only on PR to main)
             - Start vite preview
             - npx playwright install --with-deps chromium
             - npm run test:e2e
             - Upload playwright-report artifact on failure
```

---

## 5. Test Data Strategy

### Unit Tests
- All data is inline (no external dependencies)
- `localStorage` mocked via Vitest's jsdom built-in

### E2E Tests
- One shared **test user** with pre-seeded data (see Section 8)
- Each E2E test that creates data should clean up after itself (delete what it created) OR use isolated data prefixes (`[E2E] Budget Name`)
- `beforeEach` resets to a known state using API calls where possible

---

## 6. Maintenance Strategy

- Tests co-located with source (`src/lib/__tests__/`, `src/hooks/__tests__/`)
- E2E tests in top-level `e2e/` directory
- Page Object Model (POM) not required at this scale — use locator helpers only
- `data-testid` attributes added to key interactive elements as needed
- Coverage thresholds enforced in CI to prevent regression

---

## 7. Delivery Summary

| # | File | Type | Status |
|---|------|------|--------|
| 1 | `package.json` | Config | NEW (additions only) |
| 2 | `vite.config.ts` | Config | MODIFIED (coverage block) |
| 3 | `playwright.config.ts` | Config | NEW |
| 4 | `src/lib/__tests__/security.test.ts` | Unit | NEW |
| 5 | `src/lib/__tests__/transactionUtils.test.ts` | Unit | NEW |
| 6 | `src/lib/__tests__/transactionDateRange.test.ts` | Unit | NEW |
| 7 | `src/lib/__tests__/exchangeRateService.test.ts` | Unit | NEW |
| 8 | `src/lib/__tests__/reminderAmount.test.ts` | Unit | NEW |
| 9 | `e2e/fixtures/auth.ts` | E2E helper | NEW |
| 10 | `e2e/auth.spec.ts` | E2E | NEW |
| 11 | `e2e/transactions.spec.ts` | E2E | NEW |
| 12 | `e2e/budgets.spec.ts` | E2E | NEW |
| 13 | `e2e/savings.spec.ts` | E2E | NEW |
| 14 | `e2e/reminders.spec.ts` | E2E | NEW |
| 15 | `.github/workflows/ci.yml` | CI | NEW |

**Total: 5 new unit test files + 5 E2E files + 3 config files**

Estimated unit test count: **~99 new cases** across 5 files
Estimated E2E test count: **~38 new cases** across 5 files

---

## 8. Questions — REQUIRED Before Implementation

Before writing a single line of test code, I need answers to the following:

**Q1 — Supabase test environment**
Do you have a separate Supabase project for testing, or should E2E tests use a dedicated test user on the existing project?

**Q2 — Test user credentials**
What email and password should E2E tests use for authentication? (These will go into `.env.test`, which is git-ignored.)

**Q3 — E2E base URL**
Should E2E tests run against:
- (a) `http://localhost:8080` (dev server started before tests), or
- (b) A staging/preview URL?

**Q4 — CI secrets**
If including GitHub Actions, which repository secrets are already configured?
At minimum needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Q5 — Browser scope**
Should E2E tests run on Chromium only (faster CI), or also Firefox and WebKit (Safari)?

**Q6 — Coverage gate**
Are the suggested thresholds (70% lines/functions, 65% branches) acceptable, or do you want a different bar?

**Q7 — `data-testid` attributes**
Some E2E locators will be more stable with `data-testid` attributes on form fields and buttons. Are you comfortable with small, non-functional additions to component files for this purpose?

---

## Approval

Reply **"Go"** to proceed with full implementation, or provide answers/changes to any of the above.
