-- Add budget_id to transactions so expenses can be explicitly linked to a budget
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Index for fast budget-scoped queries
CREATE INDEX IF NOT EXISTS idx_transactions_budget_id
  ON public.transactions(budget_id)
  WHERE budget_id IS NOT NULL;

-- Backfill: assign budget_id to existing expense transactions.
-- Prefers exact category match; falls back to a total-budget (category_id IS NULL).
-- Only picks budgets whose date range covers the transaction date.
UPDATE public.transactions t
SET budget_id = (
  SELECT b.id
  FROM public.budgets b
  WHERE b.user_id = t.user_id
    AND b.is_template = FALSE
    AND b.start_date IS NOT NULL
    AND b.end_date   IS NOT NULL
    AND t.date >= b.start_date
    AND t.date <= b.end_date
    AND (
      b.category_id = t.category_id   -- exact category match
      OR b.category_id IS NULL         -- or a total / catch-all budget
    )
  ORDER BY
    (b.category_id IS NOT NULL) DESC,  -- prefer specific over total
    b.created_at DESC
  LIMIT 1
)
WHERE t.type = 'expense'
  AND t.budget_id IS NULL;
