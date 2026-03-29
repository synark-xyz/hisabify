---
created: 2026-03-28T00:00:00.000Z
title: Split expenses with friends
area: general
files:
  - src/components/TransactionForm.tsx
  - src/hooks/useTransactions.tsx
  - supabase/migrations/
---

## Problem

Users frequently split bills (restaurants, trips, shared utilities) but must track who owes what in a separate app (Splitwise, WhatsApp notes). Bringing split tracking in-app captures the full financial picture and adds a powerful social/collaborative dimension that drives friend invites.

## Solution

- **Split on transaction creation:** `TransactionForm` gets a "Split with friends" toggle. When toggled, user selects Circle contacts and chooses split mode: equal, custom amounts, or percentage
- **Split request record:** Each split creates a `split_requests` entry: `id`, `transaction_id`, `requested_by`, `requested_from` (user_id or email for non-users), `amount_owed`, `currency`, `status` ('pending' | 'settled' | 'declined'), `settled_at`
- **Recipient notification:** In-app notification + optional push for split request. Non-Hisabify users receive a shareable link showing their share (no account required to view)
- **Settlement:** Recipient taps "Mark as Paid" to settle; optionally links a settlement transaction. Requester can also mark as settled manually
- **Ledger view:** New "Splits" tab or section in profile — per-friend running balance ("Sayem owes you ৳450", "You owe Riya ৳200"), filterable by settled/pending
- **Reminders:** Automated follow-up notification after 3 and 7 days for unsettled splits
- **Currency handling:** Splits store amount in transaction's original currency; each party sees it converted to their own base currency
- **Transaction form integration:** Existing `TransactionForm` `initialData` prop extended with `splitConfig` — pre-filled when creating a split from the Fira AI assistant
- **No-account splits:** Generate a shareable URL `/split/{split_id}` showing amount owed, merchant, and a CTA to download Hisabify
