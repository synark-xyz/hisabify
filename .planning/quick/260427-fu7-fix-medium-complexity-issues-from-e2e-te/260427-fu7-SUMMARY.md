# Quick Task 260427-fu7: Fix Medium Complexity Issues from E2E_TEST_PLAN.md

**Completed:** 2026-04-27
**Status:** Complete

## Changes

### OE-02 — Event Bus Removed
- Deleted `src/lib/transaction-events.ts` and `src/hooks/useTransactionUpdateListener.ts`
- Removed all 8 `emitTransactionUpdated()` calls from callers:
  - `src/lib/savings.ts` (3 calls)
  - `src/components/TransactionForm.tsx` (2 calls)
  - `src/pages/ExpensesPage.tsx` (1 call)
  - `src/components/Layout.tsx` (1 call)
  - `src/hooks/useBudgets.tsx` (1 call, moved to budget-updated-only)
  - `src/hooks/usePaymentReminders.ts` (1 call)
- Supabase real-time subscriptions are now the sole cross-component notification mechanism

### OE-03 — Analytics Consolidated
- Created `src/hooks/useAnalytics.ts` — single hook dispatching to Firebase Analytics, Supabase activity_log, and user_behavior_events internally
- Deleted `src/hooks/useScreenTracking.ts`, `src/hooks/useActivityLog.ts`, `src/hooks/useUserBehavior.ts`
- Created `src/hooks/useActivityHistory.ts` — preserves the activity list-fetching behavior from the old useActivityLog
- Updated 6 callers: App.tsx, TransactionForm.tsx, ReceiptScannerModal.tsx, AddBudgetModal.tsx, DebtPage.tsx, ActivityHistoryPage.tsx

### OE-04 — Budget Utilities Extracted
- Created `src/lib/budgetUtils.ts` with pure functions:
  - `calculateBudgetStatus(spent, budgetAmount, threshold)` → `'safe' | 'warning' | 'utilized' | 'exceeded'`
  - `computeBudgetSpending(budget, spent, threshold)` → spent/remaining/percentage/status
  - `dedupeBudgetPeriods(budgets)` → deduplicates recurring budget periods
- Moved `Budget` and `BudgetWithSpending` types to `budgetUtils.ts` (prevents circular import)
- Refactored `useBudgets.tsx` to use extracted utilities (~77 lines removed)
- Added unit test `src/hooks/__tests__/budgetUtils.test.ts`

### OE-06 — ReceiptScannerModal Lazy-Loaded
- Replaced static import in `AddTransactionModal.tsx` with `React.lazy()` dynamic import
- Wrapped in `<Suspense fallback={null}>` — WASM only loads when scanner opens

### SPEC-01 — e2e/insights.spec.ts (8 flows)
- `/insights` loads with Analytics tab default
- Tab switching to Reports
- Date range selector interaction
- Year-over-year comparison chart
- Spending heatmap rendering
- PDF export button presence
- CSV export triggers file download
- Period filter (Monthly/Yearly) updates data
- `/analytics` and `/reports` redirects to `/insights`

### SPEC-02 — e2e/settings.spec.ts (7 flows)
- `/settings` loads with nav links
- Currency selector visible on preferences
- Currency change persists after reload
- Theme toggle (dark/light) applies to html element
- Language switcher changes UI text
- Toggle switches visible on notifications page
- Toggling notifications doesn't crash

### SPEC-03 — e2e/debts.spec.ts (7 flows)
- `/debts` loads with heading
- Add Debt modal opens via CTA
- Creating debt appears in list
- Debt card shows creditor name and amount
- Repayment recording updates balance
- Deleting debt removes from list
- Free users can add at least one debt

### SPEC-07 — e2e/premium.spec.ts (6 flows)
- Free user sees upgrade prompt for second savings goal
- Free user sees upgrade prompt for second budget
- Upgrade modal shows monthly and yearly plans
- "Maybe Later" dismisses without navigation
- Premium features accessible with seeded account
- Referral code redemption flow

### SPEC-08 — e2e/payment-reminders-create.spec.ts (6 flows)
- Add Reminder button opens modal from dashboard
- Form fills create reminder visible in list
- New reminder appears in carousel
- Editing updates displayed details
- Mark as paid shows "Paid" badge
- Deleting removes from list

### SPEC-09 — e2e/navigation.spec.ts (6 flows)
- Bottom nav visible on main pages
- FAB visible on main pages
- Each nav item navigates correctly
- Unknown route shows 404
- `/auth/callback` handles missing params gracefully
- Back-navigation from sub-route works
- Bottom nav on all 4 main pages

## Verification
- TypeScript: `npx tsc --noEmit` — 0 errors
- ESLint: 0 errors, 21 warnings (pre-existing, unrelated to changes)
- Unit tests: 208 passed (16 pre-existing failures unrelated to changes)