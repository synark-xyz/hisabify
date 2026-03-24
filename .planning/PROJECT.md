# Hisabify

## What This Is

Hisabify is a mobile-first personal finance web app (React + Capacitor) for individuals who want to track multiple cards, log expenses, set budgets, manage savings goals, and receive payment reminders — all without exposing data to third parties. It runs as a Progressive Web App and natively on Android and iOS via Capacitor, backed by Supabase.

## Core Value

Users can log, track, and understand their spending in seconds — across any device, with their own data.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User can sign up / sign in with email and manage their profile — v1.0
- ✓ User can add, edit, and delete cards/accounts — v1.0
- ✓ User can create, edit, and delete transactions with categories — v1.0
- ✓ User can set monthly budgets per category and track spending progress — v1.0
- ✓ User can create savings goals and transfer leftover budget funds into savings — v1.0
- ✓ User can create recurring payment reminders — v1.0
- ✓ User can view analytics (monthly spend line chart, category donut) — v1.0
- ✓ User can switch display currency with live exchange rates — v1.0
- ✓ User can share a referral code and receive Pro days for successful referrals — v1.0
- ✓ User can see their Financial Health Score on the dashboard — v1.0
- ✓ User can export/view reports (CSV/PDF) — v1.1
- ✓ User can receive push notifications for payment reminders — v1.1
- ✓ User can add transactions via voice memo (Web Speech API) — v1.1
- ✓ User can scan receipts with OCR to pre-fill transactions — v1.1
- ✓ User is gated from premium features; RevenueCat drives subscription entitlement — v1.1
- ✓ User can delete their account and all associated data — v1.1

### Active

<!-- Current scope. Building toward these. -->

(None yet — defining next milestone)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Bank syncing (Plaid) — high complexity, not core to value proposition for MVP phases
- Multi-user shared wallets — complex permissions, deferred to v3+
- Complex ML auto-categorization — beyond current AI scope; regex-based for now
- Offline-first mode (SQLite sync) — medium priority, Phase 5+ in original roadmap

## Context

- **Platform:** React 18 + TypeScript + Vite SPA, deployed as Capacitor native app (Android/iOS)
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Subscriptions:** RevenueCat for iOS/Android entitlement management; `PremiumGuard` component gates features
- **Mobile:** Capacitor 8, Android/iOS builds from `android/` and `ios/` directories
- **Known concerns:** Web Speech API fragility on some browsers; exchange rate API free-tier limits; FCM token cleanup debt; RLS integration tests missing
- **Analytics/Crash:** Firebase Crashlytics + Analytics; Sentry not yet initialized (scaffolded)

## Constraints

- **Tech Stack:** React + Supabase — all features must fit this architecture
- **Mobile:** Must work on Capacitor Android + iOS, not just web
- **Monetization:** Free tier (1 budget, 1 savings goal, 30 days history); Pro tier ($4.99/mo via RevenueCat)
- **Privacy:** Minimal telemetry; no third-party data sharing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| RevenueCat for subscriptions | Cross-platform IAP without managing Stripe + App Store separately | ✓ Good |
| Web Speech API over Capacitor plugin | `@capacitor-community/speech-recognition` is unmaintained | — Pending |
| AI parsing via regex (not LLM) | Low latency, no API cost for basic voice/OCR parsing | — Pending |
| Capacitor 8 for mobile | Enables native builds from single React codebase | ✓ Good |
| Supabase Edge Functions for scheduling | Serverless cron for push notification delivery | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 — GSD bootstrap, milestone v1.2 starting*
