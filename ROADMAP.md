# Product Roadmap: Hisabify

This document outlines the vision for Hisabify, categorized by functional domains and priority.

## 🌟 Core Vision
To become the most frictionless and engaging personal finance manager, helping users move from "tracking" to "thriving."

---

## 🏗️ 1. Infrastructure & Monetization (High Priority)
- [ ] **Subscription Gating**: Implement `useSubscription` and `PremiumGuard` (As per `PRD.md`).
- [ ] **Payment Gateway**: Integrate Stripe Checkout for web subscriptions.
- [ ] **Google Authentication**: One-tap sign-in/signup integration.
- [ ] **Data Portability**: Premium feature to export transactions to CSV, Excel, and PDF.
- [ ] **Backup & Sync**: Ensure seamless real-time syncing across devices via Supabase.
- [ ] **Sentry Error Tracking**: Wire up production error reporting. Scaffolding already exists but is inert.
  - Install `@sentry/react`, add `initSentry()` called from `main.tsx`, and activate the commented-out `captureException`/`captureMessage` calls in `src/lib/logger.ts` (the existing `ErrorBoundary` already routes through `logger`).
  - Register `sentryVitePlugin` (already a devDependency) in `vite.config.ts` for production builds only. Use `build.sourcemap: "hidden"` and `filesToDeleteAfterUpload` so maps are uploaded but never shipped; make upload failures non-fatal.
  - Needs two separate credentials: the **public DSN** as `VITE_SENTRY_DSN` in `.env` (runtime, safe to expose) and the **secret** `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` in `.env.sentry-build-plugin` (build-time source-map upload only, gitignored).
  - ⚠️ Never put an `sntrys_` auth token in a `VITE_`-prefixed var — it gets baked into the public client bundle. The current token was exposed this way and should be rotated before use.
  - Tighten `VITE_SENTRY_DSN` in `src/lib/env.ts` to `z.string().url()` so an auth token can't be pasted in by mistake.

## 🎮 2. Gamification & Retention (Medium Priority)
- [ ] **Financial Health Score**: A 0-100 score based on budget adherence and logging consistency.
- [ ] **Streaks & Badges**: 
    - "7-Day Fire": Logged expenses for a full week.
    - "Budget Master": Stayed under budget in all categories for 1 month.
- [ ] **Savings Goals Visualization**: Animated progress bars (e.g., a "filling" jar or a "growing" mountain).
- [ ] **Smart Notifications**: Reminders to log daily expenses (PWA push notifications).

## 🤖 3. Automation & AI (High Priority - Premium)
- [ ] **Receipt OCR**: Use AI (e.g., OpenAI or Tesseract) to extract date, merchant, and total from photos.
- [ ] **Recurring Transactions**: Set up monthly/weekly repeating expenses (Rent, Netflix).
- [ ] **Auto-Categorization**: Machine learning to guess category based on merchant name.
- [ ] **Spending Insights**: "You spent 20% more on coffee this week than last week."

## 🤝 4. Social & Collaborative (Low Priority)
- [ ] **Shared Wallets**: Share a specific budget or wallet with a partner or roommate.
- [ ] **Expense Splitting**: Simple tool to split a dinner bill and track who owes what.
- [ ] **Community Benchmarks**: (Anonymous) "People in your city spend $X on groceries on average."

## 🌍 5. Expansion (Medium Priority)
- [ ] **Multi-Currency 2.0**: Automatic fetching of live exchange rates.
- [ ] **Dark Mode Optimization**: Refine premium gradients for OLED screens.
- [ ] **Localization**: Support for Spanish, French, Arabic, and Hindi.

## 🗂️ 6. Dynamic Categories (Data-Driven)
- [x] **v1.1 (2026-03-29)**: Custom "Other" label — mandatory text field when "Other" selected; `custom_category_suggestions` table tracks frequency + unique users per label via RPC. Categories table extended with `type` (expense/income).
- [ ] **v2.0**: Auto-promote labels used by 10+ users to category suggestions dropdown.
- [ ] **v2.0**: Replace category dropdown with most-used chips + "More" modal grouped by type.
- [ ] **v2.0**: Autocomplete as user types in the "Other" text field (powered by suggestions table).

---

## 📈 Success Targets
- **Q1 2026**: Launch Subscription Gating & First 100 Pro Users.
- **Q2 2026**: Launch Receipt OCR & Recurring Transactions.
- **Q3 2026**: Implement Gamification V1 (Streaks/Scores).
