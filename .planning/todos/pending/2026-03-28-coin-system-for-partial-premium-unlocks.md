---
created: 2026-03-28T00:00:00.000Z
title: Coin system for partial premium feature unlocks
area: general
files:
  - src/components/UpgradeModal.tsx
  - src/hooks/useSubscription.tsx
  - src/components/PremiumGuard.tsx
  - src/integrations/supabase/types.ts
  - supabase/migrations/
---

## Problem

Premium is all-or-nothing today. Users who don't want to pay a subscription can't unlock individual features even if they've earned engagement rewards. Coins create a freemium bridge — earn through behaviour, spend on specific unlocks — increasing retention and monetisation without requiring full subscription commitment.

## Solution

- **Coin ledger:** New `user_coins` table: `user_id`, `balance`, `updated_at`. New `coin_transactions` table: `user_id`, `amount` (+/-), `source` (referral / daily_task / streak / milestone), `description`, `created_at`
- **Earn triggers:**
  - Referral events (see referral-system todo)
  - Daily login streak (10 coins/day, multiplier after 7 consecutive days)
  - Completing daily gamification tasks (see gamification todo)
  - Health score milestones (first time hitting 80, 90, 100)
- **Spend options (coin store):**
  - Extra budget slot beyond free tier — 200 coins/slot (permanent until subscription expires if pro)
  - Extra savings goal slot beyond free tier — 150 coins/slot
  - Remove ads for 7 days — 100 coins
  - Remove ads for 30 days — 350 coins
  - Unlock a specific premium analytics widget for 30 days — 250 coins
- **UI:**
  - Coin balance in Header (small coin icon + count, tappable)
  - Coin store accessible from UpgradeModal and profile
  - Earn/spend history list under profile → wallet section
- **Backend RPCs:** `earn_coins(user_id, amount, source, description)` and `spend_coins(user_id, amount, item_type)` with balance check; both atomic with audit trail
- **PremiumGuard extension:** Check both subscription AND coin-unlock status for feature access; `useSubscription` hook exposes `coinUnlocks: string[]` array
- **Coin balance exposed via `useCoins()` hook** — balance, earn history, spend history, spendCoins(), earnCoins()
