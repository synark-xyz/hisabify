-- Wire savings into the financial core via transactions and reminders.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES public.savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_savings_goal_id
  ON public.transactions(savings_goal_id)
  WHERE savings_goal_id IS NOT NULL;

ALTER TABLE public.payment_reminders
  ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES public.savings_goals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payment_reminders_savings_goal_id
  ON public.payment_reminders(savings_goal_id)
  WHERE savings_goal_id IS NOT NULL;

ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS linked_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserve_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_contribute_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_contribute_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS auto_contribute_frequency TEXT CHECK (auto_contribute_frequency IN ('weekly', 'monthly'));

CREATE INDEX IF NOT EXISTS idx_savings_goals_archived_at
  ON public.savings_goals(user_id, archived_at);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_system_category BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS category_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_name_key'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_name_key UNIQUE (name);
  END IF;
END
$$;

INSERT INTO public.categories (name, icon, color, is_system_category, category_type)
VALUES
  ('Savings', 'target', '#10B981', TRUE, 'savings'),
  ('Savings Return', 'wallet', '#3B82F6', TRUE, 'savings_return')
ON CONFLICT (name) DO UPDATE
SET
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_system_category = EXCLUDED.is_system_category,
  category_type = EXCLUDED.category_type;

DO $$
DECLARE
  savings_category_id UUID;
BEGIN
  SELECT id INTO savings_category_id
  FROM public.categories
  WHERE name = 'Savings'
  LIMIT 1;

  IF savings_category_id IS NULL THEN
    RAISE NOTICE 'Savings category missing, skipping backfill';
    RETURN;
  END IF;

  INSERT INTO public.transactions (
    user_id,
    merchant,
    amount,
    amount_original,
    amount_converted,
    currency_base,
    currency_original,
    exchange_rate,
    exchange_source,
    rate_timestamp,
    type,
    date,
    category_id,
    savings_goal_id,
    note
  )
  SELECT
    sg.user_id,
    sg.name,
    sg.current_amount,
    sg.current_amount,
    sg.current_amount,
    'USD',
    'USD',
    1,
    'migration_backfill',
    sg.created_at,
    'expense',
    sg.created_at,
    savings_category_id,
    sg.id,
    sg.name
  FROM public.savings_goals sg
  WHERE sg.current_amount > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.savings_goal_id = sg.id
    );

  UPDATE public.savings_goals
  SET
    completed_at = COALESCE(completed_at, created_at)
  WHERE current_amount >= target_amount
    AND completed_at IS NULL;

  UPDATE public.savings_goals
  SET current_amount = 0
  WHERE current_amount <> 0;
END
$$;