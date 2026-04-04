---
created: 2026-03-27T00:00:00.000Z
title: Split expenses with friends
area: general
files:
  - src/components/TransactionForm.tsx
  - src/hooks/useTransactions.tsx
  - supabase/migrations/
---

## Problem

Users frequently split bills (restaurants, trips, utilities) but must manually track who owes what outside the app. Bringing split tracking in-app increases stickiness and gives Hisabify a social/collaborative dimension.

## Solution

- **Split on transaction:** When adding a transaction, user can toggle "Split with friends" and select contacts (from Circle/device contacts)
- **Split modes:** Equal split, custom amounts, percentage split
- **Settle tracking:** Each split creates a `split_requests` record; recipient gets notification to accept/settle
- **Settlement:** Mark as "paid" manually or link to a settlement transaction
- **Ledger view:** Per-friend balance summary (you owe / they owe) similar to Splitwise
- **Reminders:** Automated reminder notifications for outstanding splits after 3/7 days
- **Currency:** Splits respect each user's base currency with conversion at time of split
- **No-account splits:** If friend isn't on Hisabify, send a shareable link showing their share
