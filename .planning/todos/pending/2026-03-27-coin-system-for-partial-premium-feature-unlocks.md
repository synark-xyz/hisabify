---
created: 2026-03-27T00:00:00.000Z
title: Coin system for partial premium feature unlocks
area: general
files:
  - src/components/UpgradeModal.tsx
  - src/hooks/useAuth.tsx
  - src/integrations/supabase/types.ts
---

## Problem

Currently premium is all-or-nothing (subscribe or stay free). Users who don't want to pay a subscription have no way to unlock individual features. Coins create a freemium bridge — earn through engagement, spend on specific unlocks — increasing retention and monetization without requiring a subscription.

## Solution

- **Coin ledger:** New `user_coins` table tracking balance, transactions (earn/spend), and source
- **Earn triggers:** Referrals, daily login streak, completing daily tasks, first-time actions, health score milestones
- **Spend options:**
  - Add extra budget slots beyond free tier limit (e.g., 50 coins/slot)
  - Add extra savings goals beyond free tier limit
  - Remove ads for 7/30 days
  - Unlock specific premium widgets temporarily
- **UI:** Coin balance in header/profile, coin store modal, earn/spend history
- **Backend:** `spend_coins()` and `earn_coins()` RPCs with audit trail
- **Guards:** Update `PremiumGuard` to check both subscription AND coin-unlock status
