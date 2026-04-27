# Hisabify — E2E Test Plan & Codebase Audit

**Date:** 2026-04-27  
**Scope:** Full end-to-end test plan, existing test audit, bug findings, and complexity review  
**Stack:** Playwright 1.49 · Vitest 4.0 · React 18 · Supabase · Capacitor 8

---

## Issues by Complexity

All bugs, over-engineering findings, and missing test coverage are grouped below by fix complexity — from trivial one-liners up to large structural refactors. Within each tier, items are ordered by impact (highest first).

---

## 🟢 Trivial — Single file, < 30 min

---

### BUG-02 · E2E Spec Route Mismatch — `/savings` Redirect

**File:** `e2e/savings.spec.ts` (all tests)  
**Status:** ❌ Entire spec will fail

`/savings` redirects to `/budget?tab=goals` in `src/App.tsx`:
```ts
<Route path="/savings" element={<Navigate to="/budget?tab=goals" replace />} />
```

The spec asserts a heading called "Savings" which no longer exists — the page renders `BudgetPage` with heading "Budget".

**Fix:**
```ts
// BEFORE (broken):
await page.goto('/savings');
await expect(page.getByRole('heading', { name: 'Savings' })).toBeVisible(...)

// AFTER (correct):
await page.goto('/budget?tab=goals');
await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible(...)
```

The `openAddGoalModal` helper and all goal interaction helpers remain valid — only the URL and heading assertion need updating in every test.

---

### BUG-05 · 5 npm Security Vulnerabilities (2 HIGH, 3 MODERATE)

**Discovered via:** `npm audit`

| Package | Severity | Issue |
|---|---|---|
| `@xmldom/xmldom <=0.8.12` | **HIGH** | Uncontrolled recursion → DoS; XML injection via comment/PI/DocType serialization |
| `vite <=6.4.1` | **HIGH** | Path traversal in optimized deps `.map` handling; arbitrary file read via WebSocket; `server.fs.deny` bypass |
| `dompurify <=3.3.3` | MODERATE | `ADD_TAGS` FORBID_TAGS bypass; `RETURN_DOM` XSS bypass; prototype pollution |
| `postcss <8.5.10` | MODERATE | XSS via unescaped `</style>` in CSS stringify output |

**Fix:**
```bash
npm audit fix          # patches xmldom, dompurify, postcss automatically
npm audit fix --force  # upgrades vite to 8.x (breaking change — test thoroughly after)
```

---

### SPEC-INFRA · Add Mobile Viewport Projects to Playwright Config

**File:** `playwright.config.ts`

The current config tests only Chromium desktop. This app is mobile-first and ships on iOS/Android via Capacitor — desktop-only E2E misses an entire class of layout bugs.

**Fix:**
```ts
// playwright.config.ts — add to the projects array
{
  name: 'Mobile Safari',
  use: { ...devices['iPhone 13'] },
},
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
},
```

---

## 🟡 Small — Single file or hook, < 2 hours

---

### BUG-01 · Failing Unit Test — Native OAuth Redirect URL ⚠️ CRITICAL

**File:** `src/lib/authRedirect.ts` + `src/lib/__tests__/authRedirect.test.ts:35`  
**Status:** ❌ Failing in `npm run test:unit`

The test `returns a native callback URL on native platforms` asserts that `getOAuthRedirectUrl()` returns `io.synark.hisabify://auth/callback` when `isNativePlatform()` returns `true`. The actual return is `http://localhost:3000/auth/callback`.

**Impact:** OAuth sign-in on iOS/Android silently falls back to the web redirect URI, causing the callback to open a browser tab rather than returning to the native app — a broken auth flow on both platforms.

**Fix direction:** Inspect the `isNativePlatform()` branch inside `getOAuthRedirectUrl()`. Either the branch is unreachable (logic error) or the `APP_SCHEME` / bundle-ID environment variable is not being read in the test environment. The mock is correctly configured — the production code has the bug.

---

### BUG-03 · Hardcoded Owner Email Bypasses Premium Gate

**File:** `src/hooks/useSubscription.tsx:23`

```ts
const isSpecialUser = user?.email === 'sam103043@gmail.com';
const isPremium = ... || isSpecialUser || isEntitled;
```

A specific email is hardcoded to grant `isPremium = true` unconditionally. This ships in the production bundle in plain text.

**Impact:** Anyone who registers with this address (if auth constraints allow) gets free premium. More concretely, the owner account is counted as a paying subscriber in analytics, skewing conversion and churn metrics. Client-side entitlement bypasses are a security smell regardless.

**Fix direction:** Remove the hardcoded check. Add an `is_admin` boolean column to the `users` table protected by RLS, read it via `useProfile()`, and evaluate it server-side.

---

### BUG-04 · Type-Unsafe `(supabase as any).rpc()` Cast

**File:** `src/features/referrals/hooks/useReferral.ts:31`

```ts
const { data, error } = await (supabase as any).rpc('redeem_referral_code', { ... });
```

The `as any` cast disables TypeScript checks on this call. If the RPC function signature changes (parameter rename, new required arg), this fails silently at runtime with no compile-time warning.

**Fix direction:** Regenerate Supabase types (`supabase gen types typescript`) to include `redeem_referral_code` in the function definitions, then remove the cast.

---

### BUG-06 · 23 Lint Warnings — Missing Hook Dependencies

**Discovered via:** `npm run lint`

The most impactful of the 23 `react-hooks/exhaustive-deps` warnings:

| File | Line | Impact |
|---|---|---|
| `TransactionDetailsDialog.tsx:86` | Missing `transaction?.budget_id`, `transaction?.savings_goal_id` in `useEffect` deps | Form does not re-initialise when the transaction prop changes |
| `VoiceInputFlow.tsx:61` | Missing `reset`, `stop` in `useEffect` | Voice recording may not clean up on unmount, leaking the mic stream |
| `ExpensesPage.tsx:231,483` | Missing `t` (i18n) in `useCallback`/`useMemo` | Labels stay in the old language after the user switches language |
| `AuthCallbackPage.tsx:166` | Missing `t` in `useEffect` | Same i18n stale-closure issue on the OAuth callback screen |

**Fix direction:** Add the missing dependencies. For intentional omissions, suppress with `// eslint-disable-next-line react-hooks/exhaustive-deps` and a brief comment explaining why.

---

## 🟠 Medium — Multiple files or coordinated change, 2–8 hours

---

### OE-02 · Dual State Notification System — Custom Event Bus + Supabase Real-time

**Files:** `src/lib/transaction-events.ts` and 7 callers

Two parallel mechanisms notify components of transaction changes:

1. **Supabase real-time** — hooks subscribe to `postgres_changes` events directly.
2. **Custom in-memory event bus** — `emitTransactionUpdated()` is called from `TransactionForm`, `Layout`, `useBudgets`, `usePaymentReminders`, `savings.ts`, and `ExpensesPage`.

Both systems serve the same purpose independently. A single transaction change can fire both, causing double re-fetches. In tests, the event bus is invisible to Playwright — `await expect(...)` cannot reliably wait for state changes triggered only through the bus.

**Recommendation:** Delete `src/lib/transaction-events.ts` and all its callers. Use Supabase real-time subscriptions exclusively as the single source of truth for cross-component invalidation.

---

### OE-03 · Three Overlapping Analytics / Tracking Systems

**Files:** `useScreenTracking.ts`, `useActivityLog.ts`, `useUserBehavior.ts`

Three independent tracking mechanisms fire on every user action:

1. `useScreenTracking()` — Firebase Analytics screen views (external service)
2. `useActivityLog()` — Writes to `activity_log` Supabase table (async DB write)
3. `useUserBehavior()` — In-memory session engagement scoring (memory only)

No unified abstraction exists. Each is independently wired, independently maintained, and independently broken by API changes.

**Why it matters for testing:** E2E tests cannot assert analytics state because it is split across Firebase, Supabase, and in-memory. Every user-facing flow triggers all three systems, adding async latency to tests.

**Recommendation:** Consolidate into a single `useAnalytics()` hook that dispatches internally. This makes the whole layer mockable in tests with one `vi.mock()`.

---

### OE-04 · `useBudgets.tsx` — 828-line Hook with Blurred Responsibilities

**Files:** `src/hooks/useBudgets.tsx`, `src/hooks/useBudgetContext.tsx`

`useBudgets` handles CRUD, spending calculations, period filtering, currency conversion, and real-time subscriptions in one file. `useBudgetContext` partially duplicates it by adding "which budget is relevant right now" awareness — with no clearly documented boundary between the two.

**Recommendation:** Restrict `useBudgets` to CRUD + real-time only. Extract spending calculations and status logic (safe/warning/exceeded) into a pure `src/lib/budgetUtils.ts` that is independently testable without mocking Supabase.

---

### OE-06 · Heavy Client-Side OCR Bundle (Tesseract.js + Gemini Vision)

**File:** `src/components/ReceiptUpload.tsx`

Tesseract.js (~5MB WASM) is loaded at startup via `ReceiptUpload`, which is imported into the main bundle. The Google Gemini Vision API is also called client-side, exposing the API key to the browser.

**Impact:** Inflated TTI for all users, even those who never scan receipts. The Gemini key is visible in client-side network requests.

**Recommendation:** Wrap `ReceiptUpload` in `React.lazy()` so it only loads when the scanner is opened. Move the Gemini Vision call to a Supabase Edge Function — the heavy WASM stays server-side and the API key stays secret.

---

### SPEC-01 · Write `e2e/insights.spec.ts` — Analytics & Reports (Priority: HIGH)

The Insights page (`/insights`) has zero E2E coverage. Note: `/analytics` and `/reports` are redirects to `/insights` with tab params — tests must use the canonical URL.

**Flows to cover:**

1. Page loads at `/insights` with the Analytics tab active by default
2. Switching to the Reports tab renders a reports section (not a blank page)
3. Date range selector changes the chart data without a crash
4. Comparison chart (year-over-year) renders for accounts with history
5. Spending heatmap renders without crashing
6. PDF export button is present on the Reports tab
7. CSV export triggers a file download
8. Period filter (Monthly/Yearly) updates displayed data

---

### SPEC-02 · Write `e2e/settings.spec.ts` — Settings & Preferences (Priority: HIGH)

Settings changes affect the entire app globally. No E2E coverage exists.

**Flows to cover:**

1. `/settings` loads with navigation links visible
2. `/settings/preferences` loads — currency selector is visible
3. Changing display currency persists on page reload
4. Changing theme (dark/light) applies to the `<html>` element class or `data-theme`
5. Language switcher changes visible UI text to the selected language
6. `/settings/notifications` loads — toggle switches are visible
7. Toggling a notification preference does not crash the page

---

### SPEC-03 · Write `e2e/debts.spec.ts` — Debt Tracking (Priority: MEDIUM)

**Flows to cover:**

1. `/debts` loads with heading visible
2. Add Debt modal opens via CTA button
3. Creating a debt (name, amount, due date) makes it appear in the list
4. Debt card shows creditor name and amount
5. Recording a repayment updates the remaining balance
6. Deleting a debt removes it from the list
7. Premium gate: free users can add at least one debt

---

### SPEC-07 · Write `e2e/premium.spec.ts` — Premium Gates & Upgrade Flow (Priority: HIGH)

Revenue-critical flows with zero E2E coverage.

**Flows to cover:**

1. Free user sees upgrade prompt when adding a second savings goal
2. Free user sees upgrade prompt when adding a second budget (if limited)
3. Upgrade modal shows monthly and yearly plan options
4. "Maybe Later" dismisses the upgrade modal without navigating away
5. Premium features are accessible with a seeded premium test account (`E2E_PREMIUM_EMAIL`)
6. Referral grant: redeeming a valid referral code grants temporary Pro access

**Required `.env.test` addition:**
```bash
E2E_PREMIUM_EMAIL=...
E2E_PREMIUM_PASSWORD=...
```

---

### SPEC-08 · Write `e2e/payment-reminders-create.spec.ts` — Reminder CRUD (Priority: MEDIUM)

The existing `reminders.spec.ts` only smoke-tests the notification view. Full CRUD is untested.

**Flows to cover:**

1. "Add Reminder" button opens the create modal from the dashboard
2. Filling in name, amount, due date, and recurrence creates the reminder
3. New reminder appears in the dashboard carousel
4. Editing a reminder updates its displayed details
5. Marking a reminder as paid moves it to "Paid" status
6. Deleting a reminder removes it from the list

---

### SPEC-09 · Write `e2e/navigation.spec.ts` — Bottom Nav & Route Integrity (Priority: MEDIUM)

**Flows to cover:**

1. Bottom navigation bar is visible on all five main pages (Dashboard, Expenses, Budget, Insights, More)
2. Each nav item navigates to the correct route
3. FAB button is visible on all main pages
4. Navigating to an unknown route renders the 404 page
5. `/auth/callback` with missing or malformed params shows an error gracefully (no crash)
6. Back-navigation from a sub-route (e.g. `/profile/personal → /profile`) works correctly

---

## 🔴 Large — Structural refactor, multiple sessions

---

### OE-01 · `ExpensesPage.tsx` — 1,253-line God Component

**File:** `src/pages/ExpensesPage.tsx`

This is the only major page that bypasses the custom-hook pattern. It fetches data directly from Supabase inline, manages filtering, sorting, pagination, optimistic updates, real-time subscriptions, and renders the full UI — all in one file (1,253 lines). Every other domain uses a dedicated hook.

**Why it matters for testing:** Mocking this component for unit tests requires replicating the full Supabase query chain defined inside it. There is no seam to inject test data.

**Recommendation:** Extract all data fetching and mutation logic into a `useTransactions()` hook (matching `useBudgets`, `useSavingsGoals`, etc.). The component becomes responsible only for rendering and user interactions — and becomes unit-testable.

---

### OE-05 · 42 Custom Hooks — Several Are Unnecessary Abstractions

**Directory:** `src/hooks/`

Several hooks are thin wrappers that add no real value and should either be inlined or converted to plain utility functions:

| Hook | LOC | Issue |
|---|---|---|
| `useTransactionUpdateListener.ts` | ~20 | Thin wrapper over the event bus — obsolete once OE-02 is resolved |
| `useTransactionsForReminders.ts` | ~30 | Simple filter function — does not need to be a hook |
| `useConvertedAmount.tsx` | ~15 | Single `useMemo` wrapping `useExchangeRate` — can be inlined at call sites |
| `useFirstTimeUser.ts` | ~20 | Reads one `localStorage` key — should be a utility function, not a hook |
| `useSubscriptionPricing.ts` | ~30 | Fetches RevenueCat offerings for display — could live inside `useSubscription` |
| `useReportTemplates.tsx` | ~25 | Returns a static config object — should be a plain exported constant |

**Recommendation:** Inline or delete these six hooks. Establish a contribution guideline: a hook is justified only when it manages stateful React lifecycle. Pure data transformations belong in `src/lib/`.

---

### SPEC-04 · Write `e2e/categories.spec.ts` — Category Management (Priority: MEDIUM)

**Flows to cover:**

1. `/categories` loads and default system categories are listed
2. "Add Category" modal opens via the CTA button
3. Creating a custom category makes it selectable in the transaction form
4. Editing an existing custom category updates its name
5. Deleting a custom category (with confirmation) removes it from the list
6. System categories cannot be deleted (delete button absent or disabled)

---

### SPEC-05 · Write `e2e/profile.spec.ts` — Profile & Account (Priority: MEDIUM)

**Flows to cover:**

1. `/profile` loads with sub-navigation visible
2. `/profile/personal` shows the user's name and email fields
3. Updating display name persists after page reload
4. Avatar upload file input is accessible
5. `/profile/data` shows CSV/JSON export download buttons
6. `/profile/invite` shows the user's referral code
7. Referral code copy button shows a success toast

---

### SPEC-06 · Write `e2e/calculator-tools.spec.ts` — More Tools (Priority: LOW)

**Flows to cover:**

1. `/more` loads with all tool cards visible
2. `/more/calculator` — basic arithmetic produces correct result (2 + 2 = 4)
3. `/more/loan` — entering principal, rate, and term shows an EMI result
4. `/more/discount` — entering price and discount % shows savings amount
5. `/more/currency` — selecting two currencies and an amount shows the converted value

---

### SPEC-10 · Write `e2e/activity.spec.ts` — Activity History (Priority: LOW)

**Flows to cover:**

1. `/activity` loads without error
2. Performing a transaction (create, then delete) produces a log entry
3. Activity items display a timestamp and action description
4. List is ordered chronologically (newest first)

---

## Summary Table

| ID | Issue | Complexity | Impact |
|---|---|---|---|
| BUG-02 | savings.spec.ts route mismatch | 🟢 Trivial | High — spec entirely broken |
| BUG-05 | 5 npm CVEs (2 high, 3 moderate) | 🟢 Trivial | High — known security vulnerabilities |
| SPEC-INFRA | Add mobile viewports to Playwright config | 🟢 Trivial | Medium — catches mobile layout bugs |
| BUG-01 | Native OAuth redirect URL broken | 🟡 Small | **Critical** — broken mobile auth |
| BUG-03 | Hardcoded email bypasses premium gate | 🟡 Small | High — security + analytics skew |
| BUG-04 | `(supabase as any).rpc()` type-unsafe cast | 🟡 Small | Medium — silent runtime failure risk |
| BUG-06 | 23 lint warnings — stale hook closures | 🟡 Small | Medium — stale UI state on lang switch / unmount |
| OE-02 | Dual event-bus + real-time system | 🟠 Medium | Medium — double re-fetches, unreliable test waits |
| OE-03 | Three overlapping analytics trackers | 🟠 Medium | Medium — untestable, adds async latency |
| OE-04 | useBudgets.tsx 828-line hook | 🟠 Medium | Medium — untestable calculation logic |
| OE-06 | Heavy OCR bundle not lazy-loaded | 🟠 Medium | Medium — inflated TTI for all users |
| SPEC-01 | Write insights.spec.ts | 🟠 Medium | High — key feature has zero E2E coverage |
| SPEC-02 | Write settings.spec.ts | 🟠 Medium | High — global state changes untested |
| SPEC-07 | Write premium.spec.ts | 🟠 Medium | High — revenue-critical flow untested |
| SPEC-03 | Write debts.spec.ts | 🟠 Medium | Medium |
| SPEC-08 | Write payment-reminders-create.spec.ts | 🟠 Medium | Medium |
| SPEC-09 | Write navigation.spec.ts | 🟠 Medium | Medium |
| OE-01 | Extract useTransactions() from ExpensesPage | 🔴 Large | Medium — enables unit testing of transactions |
| OE-05 | Remove 6 unnecessary thin-wrapper hooks | 🔴 Large | Low — code hygiene |
| SPEC-04 | Write categories.spec.ts | 🔴 Large | Medium |
| SPEC-05 | Write profile.spec.ts | 🔴 Large | Medium |
| SPEC-06 | Write calculator-tools.spec.ts | 🔴 Large | Low |
| SPEC-10 | Write activity.spec.ts | 🔴 Large | Low |
