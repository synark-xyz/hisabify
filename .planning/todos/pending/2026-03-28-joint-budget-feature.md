---
created: 2026-03-28T00:00:00.000Z
title: Joint budget feature
area: general
files:
  - src/hooks/useBudgets.tsx
  - src/components/AddBudgetModal.tsx
  - src/pages/BudgetPage.tsx
  - supabase/migrations/
---

## Problem

Budgets are single-user only. Couples, roommates, and families share expenses but track them separately, making it impossible to see combined spending against a shared limit. This is one of the top requested features in personal finance apps targeting household use cases.

## Solution

- **Shared budget model:** New `budget_members` table — `budget_id`, `user_id`, `role` ('owner' | 'member'), `spending_limit` (optional per-member cap), `joined_at`. FK to `budgets.id`
- **Invite flow:** Budget owner invites by email or referral code; invited user receives in-app notification to accept or decline. Accept inserts a `budget_members` row
- **Shared spending:** Transactions tagged to a joint budget by any member are visible to all members. Spending totals aggregate across all members against the shared limit
- **Real-time sync:** Supabase real-time subscription on the budget's channel — all members see live spending updates without refresh
- **Permissions:** Owner can set per-member spending cap within the joint budget; owner can remove members; members can leave
- **UI:** Joint budgets shown with member avatar stack, per-member contribution bar, and combined progress ring. Badge distinguishes joint vs personal budgets in BudgetPage list
- **Notifications:** Push notification to all members when budget hits 80% and 100%
- **RLS policies:** Update budget RLS to allow read/write for all `budget_members` of a given budget; protect against non-members
- **Premium:** Joint budgets are a pro feature (or coin-unlock for 1 joint budget on free tier)
