# Transaction Details Insights

Add budget impact and pattern insights to the existing `TransactionDetailsPage` as compact inline cards, using data already available from useBudgets and one additional lightweight merchant query.

## Budget Impact Card

Appears directly below the budget/goal link card when a transaction is linked to a budget or goal.

### Linked to a budget

Shows what percentage of the budget this single transaction represents, with a visual progress bar and remaining amount.

```
┌──────────────────────────────────────────────┐
│ 📊 This transaction: $45.00 · 18% of Groceries  │
│    Already spent: $200.00 (80%) · $50 remaining  │
│    [████████████████░░░░░░░░░]                    │
│    🟢 On track                                    │
└──────────────────────────────────────────────┘
```

- Amounts and % calculated from the linked budget's `spent`, `remaining`, and `percentage` fields (already on `BudgetWithSpending`)
- The `remaining` shown is post-this-transaction: `budget.remaining - transaction.amount`
- Status color matches the budget status system: green (safe), yellow (warning/at threshold), yellow/red (exceeded)
- Hidden entirely if there is no linked budget

### Linked to a goal

Same visual pattern, adapted for goals:

```
┌──────────────────────────────────────────────┐
│ 🎯 Contribution: $45.00 · 9% of "New Laptop"    │
│    Saved: $350.00 (70%) · $150 to go             │
│    [████████████████████░░░░░░░]                  │
│    🟢 On track                                    │
└──────────────────────────────────────────────┘
```

- Uses `linkedGoal.current_amount`, `linkedGoal.target_amount`, `linkedGoal.percentage`
- Progress bar and status are read-only from the goal's computed fields

## Pattern Insights Card

Appears below the tags section (above note/receipt). Provides merchant frequency and recurring pattern matching context.

```
┌──────────────────────────────────────────────┐
│ 📈 This month at Walmart · 3 visits           │
│    Total: $245.00 · Avg: $81.67/visit         │
│    🔁 Matches recurring "Groceries" ($45/mo)  │
└──────────────────────────────────────────────┘
```

### Data source
- One lightweight Supabase query: count + sum of same-merchant, same-type transactions in the current month, excluding the current transaction itself
- Recurring expense match: fuzzy check the current transaction's merchant/amount against `recurring_expenses` (title similarity, amount within ±20%)

### Visibility rules
- Hidden if no `merchant` name on the transaction
- Hidden if only 1 visit this month AND no recurring expense match
- Hidden if merchant frequency data is still loading (show spinner or nothing)
- Recurring match row shown only when confidence is high (fuzzy title match + amount within ±20%)

### Edge cases
- Visit count: excludes up to ±2 days from current month boundaries for recency
- Zero-dollar transactions or test data: filtered out via existing transaction type rules
- Same merchant, different types: grouped by type (expense vs income etc) — only same-type counts

## Implementation

### Files changed
- `src/pages/TransactionDetailsPage.tsx` — two new cards in the main content area
- No new components, no new hooks — plain inline rendering using existing hooks

### Data flow
1. Budget impact: purely computed from `budgets` (already in useBudgets context) + `localBudgetId`
2. Pattern insights: `useEffect` fires a `supabase.from('transactions').select(...)` when `transaction.merchant` is set, fetching merchant frequency for current month
3. Both sections render conditionally based on data presence

### Performance
- Budget impact: no new queries, pure computation
- Pattern insights: single filtered query scoped to user_id + merchant + date range (indexed on `user_id`, `merchant`, `date`)

### Testing
- Unit test for budget impact calculation correctness
- Unit test for pattern insight visibility rules
- Integration test: render TransactionDetailsPage with linked budget, verify budget impact card renders with correct percentages
