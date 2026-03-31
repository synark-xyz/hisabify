-- Phase 1 schema additions:
--   1. categories.parent_id        — sub-category support (self-referencing FK)
--   2. transactions.tags           — free-form tagging
--   3. transactions.status         — cleared / uncleared reconciliation
--   4. transactions.parent_transaction_id + is_split_child — split transactions

-- ── 1. Sub-categories ──────────────────────────────────────────────────────────
-- categories is a global/system table (no user_id); no RLS change needed.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- ── 2. Transaction tags ────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- ── 3. Transaction status ──────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'cleared'
  CHECK (status IN ('cleared', 'uncleared'));

-- ── 4. Split transactions ──────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID
    REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_split_child BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to efficiently fetch all child splits for a parent transaction
CREATE INDEX IF NOT EXISTS idx_transactions_parent_transaction_id
  ON public.transactions (parent_transaction_id);

-- ── 5. GIN index on tags ───────────────────────────────────────────────────────
-- Enables performant array-contains (@>) and overlap (&&) queries on tags.
CREATE INDEX IF NOT EXISTS idx_transactions_tags
  ON public.transactions USING GIN (tags);

-- ── 6. Split-transaction consistency constraint ────────────────────────────────
-- Ensures that is_split_child = TRUE always has a non-null parent_transaction_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_split_consistency'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_split_consistency
      CHECK (
        (is_split_child = FALSE AND parent_transaction_id IS NULL)
        OR
        (is_split_child = TRUE AND parent_transaction_id IS NOT NULL)
      );
  END IF;
END$$;

-- ── Rollback notes ─────────────────────────────────────────────────────────────
-- To undo this migration manually:
--
--   ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_split_consistency;
--   DROP INDEX IF EXISTS idx_transactions_tags;
--   DROP INDEX IF EXISTS idx_transactions_parent_transaction_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS is_split_child;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS parent_transaction_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS status;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS tags;
--   ALTER TABLE public.categories    DROP COLUMN IF EXISTS parent_id;
