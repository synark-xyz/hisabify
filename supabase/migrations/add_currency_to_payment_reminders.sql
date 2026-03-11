-- Add currency column to payment_reminders table (idempotent)
ALTER TABLE public.payment_reminders
ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Backfill from user's preferred currency when available
UPDATE public.payment_reminders AS pr
SET currency = u.currency
FROM public.users AS u
WHERE pr.user_id = u.id
  AND (pr.currency IS NULL OR pr.currency = '');

-- Fallback for rows without a user currency
UPDATE public.payment_reminders
SET currency = 'USD'
WHERE currency IS NULL OR currency = '';

-- Enforce defaults/constraints
ALTER TABLE public.payment_reminders
ALTER COLUMN currency SET DEFAULT 'USD';

ALTER TABLE public.payment_reminders
ALTER COLUMN currency SET NOT NULL;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_payment_reminders_currency
ON public.payment_reminders(currency);

COMMENT ON COLUMN public.payment_reminders.currency IS 'ISO 4217 currency code for the reminder amount';
