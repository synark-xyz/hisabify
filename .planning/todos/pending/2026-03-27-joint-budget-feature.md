---
created: 2026-03-27T00:00:00.000Z
title: Joint budget feature
area: general
files:
  - src/hooks/useBudgets.tsx
  - src/components/AddBudgetModal.tsx
  - src/pages/BudgetPage.tsx
  - supabase/migrations/
---

## Problem

Budgets are single-user only. Couples, roommates, and families need shared budgets where multiple users can add expenses and see combined spending against a shared limit in real time.

## Solution

- **Shared budget model:** `budget_members` table linking budgets to multiple user IDs with roles (owner/member)
- **Invite flow:** Budget owner invites by email/referral code; invitee gets in-app notification to accept
- **Shared spending:** Transactions tagged to a joint budget are visible to all members; spending totals aggregate across all members
- **Real-time sync:** Supabase real-time subscription on joint budget channels so all members see live updates
- **Permissions:** Owner can set per-member spending limits within the joint budget
- **UI:** Joint budgets shown with member avatars, per-member contribution breakdown, and combined progress bar
- **Notifications:** Alert all members when budget reaches 80% and 100%
- **RLS:** Policy allows budget members to read/write to shared budget transactions
