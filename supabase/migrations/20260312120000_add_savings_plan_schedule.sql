ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS plan_frequency TEXT CHECK (plan_frequency IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS plan_start_date DATE,
  ADD COLUMN IF NOT EXISTS auto_remind BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
DECLARE
  existing_constraint text;
BEGIN
  SELECT conname
  INTO existing_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.payment_reminders'::regclass
    AND pg_get_constraintdef(oid) LIKE '%recurring_interval%';

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.payment_reminders DROP CONSTRAINT %I', existing_constraint);
  END IF;

  ALTER TABLE public.payment_reminders
    ADD CONSTRAINT payment_reminders_recurring_interval_check
    CHECK (recurring_interval IS NULL OR recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly'));
END $$;
