---
created: 2026-03-28T00:00:00.000Z
title: Custom user categories and transaction sub-labels
area: general
files:
  - src/types/index.ts
  - src/hooks/useCategories.ts
  - src/components/TransactionForm.tsx
  - supabase/migrations/
---

## Problem

The category system is flat with only system-defined categories. Users in South Asian markets (primary audience) have spending patterns that don't map to generic categories (e.g., "Rickshaw/CNG", "Tiffin service", "Tuition fees"). Forcing all uncategorised spend into "Others" destroys analytics granularity and makes reports useless.

## Solution

**Two-layer approach for maximum flexibility with minimum schema complexity:**

**Layer 1 — Custom Categories (user-scoped):**
- Add `user_id UUID REFERENCES users(id)` column to `categories` table (nullable; NULL = system category)
- Users can create, rename, and delete their own categories (with custom icon + color picker)
- Category picker in TransactionForm groups: **System Categories** (always shown first) → **My Categories** (user-created, shown with a small badge)
- `useCategories` hook updated to fetch both `user_id = null` (system) and `user_id = current_user` entries
- Free users: up to 5 custom categories. Pro users: unlimited
- RLS: users can only read/write/delete categories where `user_id = auth.uid()`

**Layer 2 — Transaction Sub-label (free-form tag):**
- Add `sub_label TEXT` column to `transactions` table (nullable, max 50 chars)
- Small optional text input below the category picker in TransactionForm: "Sub-label (optional)" — e.g., "work lunch", "date night", "monthly subscription"
- Sub-labels show as a smaller secondary line in TransactionItem (below category name)
- Sub-labels are filterable in ExpensesPage search — searching "work lunch" surfaces all tagged transactions
- No management UI needed — sub-labels are ad-hoc strings, not a managed entity

**Why this approach vs. true subcategory hierarchy:**
A parent-child category hierarchy (e.g., Food > Dining > Work Lunch) adds significant UI complexity in pickers, analytics, and budgeting. The two-layer approach gives users full flexibility (custom categories for recurring patterns, sub-labels for one-off context) without nested UI complexity.
