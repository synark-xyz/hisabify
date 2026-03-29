---
created: 2026-03-28T00:00:00.000Z
title: Premium trial loophole fix — feature degradation on expiry
area: general
files:
  - src/hooks/useSubscription.tsx
  - src/hooks/useBudgets.tsx
  - src/components/PremiumGuard.tsx
  - src/components/AddBudgetModal.tsx
  - src/pages/BudgetPage.tsx
  - src/pages/SavingsPage.tsx (or similar)
---

## Problem

Free users are limited to 1 budget and 1 savings goal. During the 7-day free trial they can create unlimited. When the trial ends without subscribing, those extra resources remain fully accessible — a loophole that undercuts the subscription value proposition.

Expected behaviour: extra resources created during trial should become **locked** (visible but inaccessible) when trial ends. They should **unlock again** automatically on subscription restore. Data must never be deleted.

## Solution

**Free tier limits:**
- Budgets: 1 active budget
- Savings goals: 1 active savings goal
- Budgets/savings beyond slot limit = locked (greyed out, content blurred, lock icon)

**Subscription state additions to `useSubscription`:**
- `isInTrial: boolean` — true if RevenueCat status is 'trialing'
- `trialEndsAt: Date | null` — from RevenueCat subscription info
- `featureLimits: { budgetSlots: number; savingsSlots: number }` — returns 1 for free/expired, Infinity for pro/trial

**Lock logic in `useBudgets`:**
- Sort budgets by `created_at` ascending
- Mark budgets beyond `featureLimits.budgetSlots` as `{ ...budget, locked: true }`
- `locked` is a client-side derived field, not stored in DB

**Lock logic in `useSavingsGoals`:** Same pattern as budgets.

**UI — Locked state:**
- Locked budget/savings cards: greyed with 60% opacity, lock icon overlay, "Resume Pro to unlock" CTA button that opens UpgradeModal
- Creation button shows tooltip "Upgrade to Pro for more budgets" (or "Use coins") and is disabled when at slot limit

**Coin unlock integration:** Users can spend coins to unlock an extra slot (see coin-system todo). `featureLimits` checks both subscription tier AND coin-purchased slots.

**No schema changes required:** Trial status derived from RevenueCat entitlement data already synced to `subscriptions` table (`trial_start`, `trial_end`, `status = 'trialing'`). Locking is purely client-side derived from subscription state vs. resource count.
