-- Add is_recurring column to budgets table
-- When true, a new budget for the next period is auto-created when this one expires
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

-- Sparse index for efficiently querying recurring budgets
CREATE INDEX IF NOT EXISTS idx_budgets_is_recurring
  ON public.budgets(user_id, is_recurring)
  WHERE is_recurring = TRUE;

COMMENT ON COLUMN public.budgets.is_recurring IS
  'When true, a new budget for the next period is auto-created on expiry';
