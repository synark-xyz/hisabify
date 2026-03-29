---
created: 2026-03-28T00:00:00.000Z
title: Quick reminder from transaction — one-tap bell icon
area: general
files:
  - src/components/TransactionItem.tsx
  - src/components/AddPaymentReminderModal.tsx
  - src/pages/ExpensesPage.tsx
  - src/types/index.ts
---

## Problem

Creating a payment reminder for a recurring expense (rent, subscriptions, bills) requires leaving the transaction list, navigating to Reminders, and manually re-entering the merchant name, amount, category, and currency. This friction means users rarely set reminders proactively, reducing the value of the reminder feature.

## Solution

Add a visible bell icon button to each `TransactionItem` row in the transaction list. One tap pre-fills and opens `AddPaymentReminderModal` with:

- **Title** = `transaction.merchant`
- **Amount** = `transaction.amount_original ?? transaction.amount`
- **Currency** = `transaction.currency_original ?? transaction.currency_base`
- **Category** = `transaction.category_id`

User only needs to set the due date (and optionally recurrence) before saving — typically a 2-tap flow.

## Implementation Notes

- Bell icon should be visible directly on the row (no swipe required) — place at right side alongside amount or as a small icon in the top-right corner of the card
- `AddPaymentReminderModal` needs an `initialData` prop added: `{ title, amount, currency, categoryId }`
- Wire handler in `ExpensesPage.tsx`: `onAddReminder?: (transaction: Transaction) => void` → opens reminder modal with pre-filled state
- Keep existing swipe-to-reveal (Edit/Delete) unaffected — bell icon is always-visible, not part of swipe actions
- Use `Bell` icon from `@phosphor-icons/react` (already used elsewhere for reminders) at size 16-18, muted color (e.g., `text-muted-foreground`) to avoid visual clutter
