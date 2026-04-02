-- Add usage_count column to categories for ranking user-added categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;

-- Index for efficient ranking queries on non-system categories
CREATE INDEX IF NOT EXISTS idx_categories_usage_count
  ON public.categories (usage_count DESC)
  WHERE is_system_category = FALSE;

-- RLS: Allow authenticated users to INSERT new non-system categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories' AND policyname = 'categories_insert_authenticated'
  ) THEN
    CREATE POLICY "categories_insert_authenticated"
      ON public.categories FOR INSERT
      TO authenticated
      WITH CHECK (is_system_category = FALSE);
  END IF;
END $$;

-- SECURITY DEFINER RPC: increments usage_count without granting UPDATE to clients
-- Called fire-and-forget from the frontend after a transaction is saved.
CREATE OR REPLACE FUNCTION public.increment_category_usage_count(p_category_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.categories
    SET usage_count = usage_count + 1
    WHERE id = p_category_id AND is_system_category = FALSE;
END;
$$;
