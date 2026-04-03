-- Phase 2 schema additions:
--   1. transactions.payment_method    — Cash, Card, Bank Transfer, Online, Cheque, Other
--   2. transactions.transfer_to_card_id — destination card for transfer transactions
--   3. transactions.transfer_fee      — optional fee for transfer transactions
--   4. debts table                    — track money owed to/from people

-- ── 1. Payment Method ─────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL
  CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online', 'cheque', 'other'));

-- ── 2. Transfer destination card ──────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_to_card_id UUID DEFAULT NULL
  REFERENCES public.cards(id) ON DELETE SET NULL;

-- ── 3. Transfer fee ───────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_fee NUMERIC(15, 2) DEFAULT NULL;

-- Index on payment_method for filter queries
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
  ON public.transactions (user_id, payment_method)
  WHERE payment_method IS NOT NULL;

-- ── 4. Debts table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  person_name TEXT NOT NULL,
  amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  type        TEXT NOT NULL CHECK (type IN ('i_owe', 'they_owe')),
  due_date    DATE DEFAULT NULL,
  status      TEXT NOT NULL DEFAULT 'outstanding'
              CHECK (status IN ('outstanding', 'partial', 'settled')),
  amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  notes       TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing user debts by status
CREATE INDEX IF NOT EXISTS idx_debts_user_status
  ON public.debts (user_id, status, created_at DESC);

-- Index for due date queries
CREATE INDEX IF NOT EXISTS idx_debts_user_due_date
  ON public.debts (user_id, due_date)
  WHERE due_date IS NOT NULL AND status != 'settled';

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION public.update_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_debts_updated_at ON public.debts;
CREATE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_debts_updated_at();

-- Row Level Security
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts"
  ON public.debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts"
  ON public.debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON public.debts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON public.debts FOR DELETE
  USING (auth.uid() = user_id);

-- ── Rollback notes ─────────────────────────────────────────────────────────────
-- To undo this migration manually:
--
--   DROP TABLE IF EXISTS public.debts;
--   DROP FUNCTION IF EXISTS public.update_debts_updated_at();
--   DROP INDEX IF EXISTS idx_transactions_payment_method;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS transfer_fee;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS transfer_to_card_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS payment_method;
