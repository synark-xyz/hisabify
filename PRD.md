**Product Requirements Document**

- **Project**: Hisabify (personal finance manager)
- **Repository**: synark-xyz/my-wallet
- **Document owner**: Product — GitHub Copilot (initial draft)

**Purpose**: Provide a lightweight, privacy-first mobile-first web app to let individual users track cards, expenses, budgets, and recurring payment reminders with simple analytics.

**Implementation Alignment (Current Build - 2026-03-12)**
- Dashboard no longer includes the Daily Quote block.
- Reminder "Mark Paid" updates reminder status only for regular bill reminders; savings-linked reminders intentionally create savings contribution transactions so savings progress remains transaction-derived.
- Client-side `setTimeout` reminder scheduling is intentionally disabled; persistent backend/system scheduling is required for reliable delivery.
- Analytics uses real transaction data only (no demo/sample fallback) and shows empty states when data is insufficient.
- Reminder dates are normalized to calendar-day-safe values to avoid timezone day-shift bugs.
- Automated test runs now generate timestamped artifacts under `test-report/<timestamp>/`, including unit coverage and E2E HTML reports.
- Savings plans are now schedule-based and live-derived from transactions using `plan_frequency`, `plan_start_date`, and `auto_remind` on savings goals; no computed pace values are stored.
- Budget and savings now operate as a connected flow: savings contributions create tagged transactions, budget leftover can be transferred into savings, and all related dashboard, analytics, and health-score views recalculate live.

**Problem Statement**: Many users lack a single, simple app to track multiple cards/accounts, recurring payments and visualize spending trends without heavy complexity or exposing data to third parties.

**Target Users**
- **Primary**: Individuals who manage multiple credit/debit cards and want a simple ledger + reminders.
- **Secondary**: Freelancers and small households needing shared visibility into expenses.

**Business Goals & Success Metrics**
- **Activation**: New users complete adding at least one card and one transaction within first session. (Target: 60% in 7 days)
- **Retention**: 30-day retention above 20%.
- **Engagement**: Weekly active users > 15% of signups; average monthly transactions per active user >= 20.
- **Reliability**: 99.9% uptime for core flows.

**Core Features (MVP)**
- **Authentication**: Sign-up / sign-in (email) and session management.
- **Cards management**: Add, edit, and remove cards with basic metadata.
- **Transactions**: Create, edit, delete transactions; tag with categories.
- **Budgets & Overviews**: Per-month expense summaries and simple budgets.
- **Payment reminders**: Create recurring payment reminders and a carousel to view upcoming reminders.
- **Analytics**: Basic charts (donut, line) for spending by category and trend over time.
- **Mobile-first UI**: Responsive components, bottom navigation, calendar and month selector.
- **Local UX niceties**: Inline validation, modals for quick add/edit, skeletons & toasts.

**Feature List (module-separated)**

- **Authentication & Profile**
	- Sign up / Sign in (email + magic link)
	- Password reset
	- User profile (display name, timezone, currency)
	- Multi-factor auth (future)

- **Cards & Accounts**
	- Add / edit / delete card or account
	- Card metadata (nickname, type, last4)
	- Card grouping/tagging
	- Add more than one card (premium) **[PREMIUM]**
	- Import cards via CSV (premium) **[PREMIUM]**

- **Transactions**
	- Create / edit / delete transactions
	- Assign transaction to card/account
	- Categories and sub-categories
	- Attach notes and receipts (image upload) **[PREMIUM]**
	- Bulk CSV import (premium) **[PREMIUM]**
	- Recurring transactions — subscription/bill templates that auto-log an expense each period (`RecurringExpensesPage.tsx` at `/more/recurring`, `useRecurringExpenses.ts`). Materialised by the `process_recurring_expenses()` RPC (`supabase/migrations/20260729111611_process_recurring_expenses.sql`): nightly at 00:05 UTC via the `process-recurring-expenses` pg_cron job, and again on every app open so a stalled cron cannot skip a cycle. Created rows carry the `recurring` tag. The `recurring_expenses` table had existed unused since 20260117155345.
	- Auto-categorization (future/ML)

- **Budgets & Goals**
	- Create monthly budgets per category
	- Track progress vs budget
	- Create monthly budgets per category
	- Track progress vs budget
	- Create savings goals (single goal free)
	- Transfer leftover budget funds into an active savings goal with paired tagged transactions
	- Link a savings goal to a budget reserve and reflect savings reservations in budget context
	- Configure a savings plan schedule (daily / weekly / monthly) with live pace tracking
	- Free auto-remind for scheduled savings goals
	- More than one savings goal (premium) **[PREMIUM]**
	- Savings history tab with running-total chart and missed-period highlights **[PREMIUM]**
	- Auto-contribute for savings goals **[PREMIUM]**
	- Alerts when nearing or exceeding budget (push/email) **[PREMIUM]**


 - **Planner**
	- Create a financial plan (one active plan free)
	- Create more than one plan (premium) **[PREMIUM]**

- **Payment Reminders & Bills**
	- Create recurring reminders (daily/weekly/monthly)
	- Upcoming reminders carousel
	- Snooze or dismiss reminders
	- Auto-generated savings reminders that deep-link into savings funding flow
	- Payment scheduling with calendar sync (premium) **[PREMIUM]**

- **Analytics & Reporting**
	- Monthly spend overview (line chart)
	- Category distribution (donut chart)
	- Savings category permanently represented in analytics
	- Savings rate insight and expense/savings combined trend view
	- Export reports to CSV/PDF **[PREMIUM]** — implemented (`ReportsPage.tsx`, `ReportExportActions.tsx`, `reportExports.ts`)
	- Custom date range comparisons (premium) **[PREMIUM]**

- **Debt & Financial Tools**
	- Debt/loan tracker with payoff progress (`DebtPage.tsx`)
	- Loan calculator, discount/tax calculator, currency converter (`MorePage.tsx` tools)

- **Smart Input & Receipt Capture**
	- Unified FAB with three entry methods: voice, receipt scan, manual (`InputMethodSheet.tsx`)
	- Voice-to-transaction parsing (Web Speech API + native Capacitor Speech Recognition)
	- Receipt OCR via Gemini Vision with image compression (`ReceiptScannerModal.tsx`)

- **Engagement, Feedback & Growth**
	- Gamification health score (40% budget / 30% savings / 30% activity) on dashboard
	- In-app star rating + feedback submission (`RatingSheet.tsx`, `FeedbackSheet.tsx`)
	- Referral program: unique code, 30-day Pro grant on redemption (see Referral System PRD below)
	- Activity history log (`ActivityHistoryPage.tsx`)

- **Notifications & Alerts**
	- In-app toasts for transactions and reminders
	- Push notifications — implemented (`usePushNotifications.ts`, `send-push-notification` edge function) **[PREMIUM]**
	- Payment reminder scheduling — `schedule-payment-reminders` runs daily at 08:00 UTC via the `daily-payment-reminders` pg_cron job (`supabase/migrations/20260729110915_fix_payment_reminder_cron.sql`). The job had in fact existed on the project since 2026-03-18 but was never captured in a migration and failed on all 134 of its runs (`unrecognized configuration parameter "app.settings.service_role_key"`), so no reminder was ever delivered. Credentials now resolve from Vault; **each environment needs its `project_url` / `service_role_key` secrets created once** before the job can succeed — see that migration's header.
	- Email notifications for critical alerts (not yet implemented)

- **Integrations & Sync**
	- Supabase backend (auth + DB + Edge Functions)
	- RevenueCat for subscription entitlement/IAP (`useRevenueCat.ts`, `revenuecat-webhook` function) — supersedes the Stripe plan in the Subscription PRD section below, which is unimplemented legacy schema
	- Third-party calendar sync (read-only) **[PREMIUM]** (not yet implemented)
	- Bank sync / transaction import (out-of-scope for MVP)

- **Settings & Admin**
	- Account settings (currency, region, locale) — `SettingsPage.tsx`, `PreferencesPage.tsx`
	- Data export / account deletion — implemented (`DataPage.tsx`, `DeleteAccountPage.tsx`); deletion is a review-gated request (`DeletionRequestSheet` → `deletion_requests` → admin approval → `process-deletion-request` edge function)
	- Privacy controls
	- Internal admin panel (`/admin`, email-allowlist gated, unlinked from nav) — read-only triage for `app_feedback` and `user_behavior_events`

- **Collaboration & Sharing**
	- Export CSV / share reports via link **[PREMIUM]**
	- Shared wallet / household accounts (future)

- **Offline & Sync**
	- Basic caching for faster loads
	- Offline creation with local queue and sync (future / premium) **[PREMIUM]** — not yet implemented

- **UX / Platform**
	- Mobile-first responsive UI, shared page-transition motion system
	- Keyboard accessibility and screen-reader support
	- Dark mode (+ cyberpunk theme)
	- Onboarding flow (`OnboardingPage.tsx`)

**Premium features notation**: Features marked with **[PREMIUM]** are intended for a paid tier. Consider gating these behind subscription checks in the backend and the UI.

**User Stories (examples)**
- As a user, I want to add a credit card with a nickname so I can separate spending per card.
- As a user, I want to add a transaction and assign a category so I can see spending summaries.
- As a user, I want to set a recurring payment reminder so I don’t miss bills.
- As a user, I want to view a monthly spending chart to compare months.

**Non-functional Requirements**
- **Performance**: UI actions should feel instantaneous; charts load under 300ms for typical small datasets.
- **Security**: No plaintext secrets in the client; use Supabase auth and RBAC for server functions.
- **Privacy**: Minimize third-party telemetry by default; provide clear data export/deletion paths.
- **Accessibility**: Basic WCAG AA support for core flows.
- **Quality/Observability**: CI and local automated test runs should retain timestamped logs, E2E artifacts, and unit coverage reports for regression tracking.

**Assumptions & Constraints**
- Supabase is used as the BaaS (present in codebase). Data model is Postgres-backed.
- App is a SPA built with TypeScript + React + Vite.

**MVP Acceptance Criteria**
- Users can sign up and persist at least one transaction to the server.
- Users can view monthly summary charts and a list of upcoming reminders.
- Basic CRUD for cards, transactions, and reminders works across refresh.

**Out-of-scope for MVP**
- Multi-user shared wallets with complex permissions.
- Bank syncing (Plaid) and automatic transaction import.
- Complex forecasting or machine-learning categorization.

**Roadmap (next releases)**
- v1 (MVP): Core features above, deploy to staging.
- v2: Data export/import, user settings, basic CSV import.
- v3: Bank feed integrations, shared wallets, advanced analytics.

**Risks & Mitigations**
- **Risk**: User data loss on client-side failures — mitigate with server-side persistence and transactional writes.
- **Risk**: Regulatory/privacy concerns — mitigate with clear privacy policy and minimal telemetry.

**Open Questions**
- Do we need multi-device offline sync for MVP? (Recommendation: postpone to v2.)
- Are there required currency-conversion accuracy/legal constraints for certain markets?

**References**
- Codebase: `src/` (React + TypeScript + components, hooks, integrations/supabase)
- Design: existing Tailwind-based components and UI primitives under `src/components/ui/`.


# PRD: Subscription Model (Business Model) - "Hisabify Pro"

**Implementation note (2026-07-29)**: The billing layer described below (Stripe checkout, webhooks, `stripe_subscription_id`) was never wired up beyond an initial `subscriptions` table migration. Actual entitlement is delivered via **RevenueCat** (`useRevenueCat.ts`, `useSubscription.tsx`, `revenuecat-webhook` edge function) plus the separate referral-grant mechanism (`referral_granted_until`). Treat the Stripe-specific steps in this section as superseded; the tier definitions and gating list below still reflect the intended product shape.

## 1. Overview
The goal of this initiative is to transition Hisabify from a free utility to a sustainable freemium product. By introducing a subscription model, we can cover operational costs and generate monthly recurring revenue (MRR).

## 2. Target Audience
- **Power Users**: Users tracking complex budgets and high transaction volumes.
- **Multilingual/Global Users**: Users needing multi-currency and live exchange rates.
- **Organization-focused Users**: Users who need to export data for tax or planning.

## 3. Subscription Tiers (Mapping Existing Features)

### 🆓 Free Tier (The "Starter" Plan)
*Core expense tracking for individuals.*
- **Unlimited Transactions**: Basic logging remains free.
- **Budgeting**: Up to **1 active budget category** (The "Planner").
- **Savings Goals**: Up to **1 active savings goal**.
- **Savings Planning**: Manual schedules and auto-remind for that one goal are included.
- **Budget Leftover Transfer**: Moving remaining budget funds into savings is included.
- **Analytics**: Basic monthly summary only.
- **Currency**: Single primary currency only.
- **History**: Last **30 days** of transaction history.

### 💎 Pro Tier (The "Pro" Plan - $4.99/mo)
*Advanced tools for serious financial management.*
- **Unlimited Budgets**: Remove the cap on budget categories.
- **Unlimited Savings Goals**: Create as many savings goals as you focus on (gated in `SavingsTabContent`).
- **Infinite History**: Access to all-time data and the **Budget vs Spending History Chart** (Existing: `BudgetHistoryChart`).
- **Savings History**: Full per-goal contribution history, running chart, and missed-period timeline.
- **Automation**: Use of the **"Copy to Next Month"** feature (Existing: `copyBudgetToNextPeriod`).
- **Savings Automation**: Auto-contribute scheduled savings goals.
- **Multi-Currency**: Access to the **Currency Selector** and live conversions (Existing: `useCurrency`).
- **Data Export**: Generate PDF/CSV reports (Implemented — gated in `ReportsPage`).
- **Advanced Insights**: Period-over-period comparisons in the **Financial Summary** (Existing: `FinancialSummary`).

## 4. Technical Requirements
- **Billing**: RevenueCat, native-only (entitlement `hisabify-pro`). There is no Stripe integration
  and no web purchase path. `users.subscription_type` is a mirror written on every entitlement
  transition, never the source of truth.
- **Entitlement Logic**: A `useSubscription` hook — an active RevenueCat entitlement **or** a
  time-boxed referral grant (`users.referral_granted_until`).
- **Manage surface**: `/settings/subscription` — status card plus Customer Center, upgrade and
  restore actions.
- **Free-tier monetisation**: an anchored AdMob banner on Android for signed-in non-premium users;
  Pro removes it.
- **UI Gating**: A `PremiumGuard` component to wrap premium features with a blur/lock UI.
- **Upsell Trigger**: Integration of an "Upgrade to Pro" modal.

## 5. AI Coding Agent Implementation Prompt
*Use this prompt to have an AI agent implement the subscription logic:*

> "Act as a Senior React Developer. Implement a subscription gating system for Hisabify. 
> 1. Create a `useSubscription` hook in `src/hooks/` that reads an `is_premium` boolean from the Supabase `profiles` table.
> 2. Create a `PremiumGuard` component that takes `children` and a `featureName`. If the user is not premium, it should show its children with a `blur-sm` filter and overlay a 'Pro' lock icon with an `onClick` that opens an Upgrade Modal.
> 3. Implement the Upgrade Modal showcasing the benefits: Unlimited Budgets, Savings Goals, History Charts, Multi-currency, and Account Exports.
> 4. Wrap the following existing components in the `PremiumGuard`: 
>    - `BudgetHistoryChart` in `BudgetDashboard.tsx`
>    - The 'Copy to Next' button in `BudgetProgressCard.tsx`
>    - The currency selection dropdown in `Settings.tsx`
> 5. Add a 1-budget limit check in the `AddBudgetModal` for free users.
> 6. Add a 1-goal limit check in the `AddSavingsGoalModal` for free users."

## 6. Roadmap Summary
- **Phase 1**: Logic & UI Gating (Current)
- **Phase 2**: Stripe Integration
- **Phase 3**: New Premium Features (OCR, Recurring)

---

# PRD: Referral System

## Overview
Each user receives a unique 8-character referral code derived deterministically from their UUID. When a new user signs up via a referral link, both parties receive **30 days of Pro access** (stacking for the referrer on each successful referral).

## Implementation Notes (as of 2026-03-17)
- **Code generation**: Inline UUID substring in `handle_new_user` DB trigger — no separate function call. Migration `20260317000100` fixes a trigger regression introduced by `20260316` and backfills NULL codes.
- **Deep link format**: `https://hisabify.app/auth?ref=CODE` — points to `/auth` directly so the param survives without a `ProtectedRoute` redirect.
- **Param forwarding**: `ProtectedRoute` forwards `?ref=` and `?challenge=` to `/auth` for unauthenticated users who open any protected URL with these params.
- **Auto-redeem**: On first profile load after signup, `useReferral` checks `localStorage.pendingReferralCode` and calls the `redeem_referral_code` RPC atomically.
- **Redemption guard**: `referred_by` and `referral_used_at` are now correctly mapped through `useProfile`, ensuring `hasUsedReferral` is accurate and the auto-redeem loop does not re-fire for users who already redeemed.
- **Pro grant**: `referral_granted_until` in `public.users` drives `hasActiveReferralGrant` in `useSubscription`; stacks for the referrer on each new successful referral.

## UI
- **Share tab**: Shows referral code with loading skeleton, copy + native share buttons, "X friends joined" count, and remaining Pro days badge.
- **Redeem tab**: Disabled with "already redeemed" message after first use; manual 8-char code entry with atomic RPC redemption.
