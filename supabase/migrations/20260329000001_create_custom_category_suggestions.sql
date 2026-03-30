-- Aggregated suggestion counters (lightweight — no arrays)
CREATE TABLE IF NOT EXISTS public.custom_category_suggestions (
  label TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('expense', 'income')),
  usage_count INTEGER NOT NULL DEFAULT 1,
  unique_user_count INTEGER NOT NULL DEFAULT 1,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  promoted BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_at TIMESTAMPTZ,
  PRIMARY KEY (label, category_type)
);

-- Dedup log — composite PK prevents double-counting per user
CREATE TABLE IF NOT EXISTS public.custom_category_user_log (
  label TEXT NOT NULL,
  category_type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (label, category_type, user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.custom_category_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_category_user_log ENABLE ROW LEVEL SECURITY;

-- Suggestions: readable by all authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_category_suggestions' AND policyname = 'suggestions_read'
  ) THEN
    CREATE POLICY "suggestions_read" ON public.custom_category_suggestions
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- User log: users see only their own rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_category_user_log' AND policyname = 'user_log_own'
  ) THEN
    CREATE POLICY "user_log_own" ON public.custom_category_user_log
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- RPC: upsert_custom_category_suggestion
-- Atomically increments usage_count and conditionally increments unique_user_count
CREATE OR REPLACE FUNCTION public.upsert_custom_category_suggestion(
  p_label TEXT,
  p_category_type TEXT,
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_normalized TEXT := LOWER(TRIM(p_label));
  v_is_new_user BOOLEAN;
BEGIN
  -- 1. Try to insert user dedup log (ON CONFLICT = existing user for this label)
  INSERT INTO public.custom_category_user_log (label, category_type, user_id)
  VALUES (v_normalized, p_category_type, p_user_id)
  ON CONFLICT (label, category_type, user_id) DO NOTHING;

  v_is_new_user := FOUND; -- TRUE if row was inserted (new user for this label)

  -- 2. Upsert suggestion counters atomically
  INSERT INTO public.custom_category_suggestions (label, category_type, usage_count, unique_user_count)
  VALUES (v_normalized, p_category_type, 1, 1)
  ON CONFLICT (label, category_type) DO UPDATE SET
    usage_count = custom_category_suggestions.usage_count + 1,
    unique_user_count = custom_category_suggestions.unique_user_count + (CASE WHEN v_is_new_user THEN 1 ELSE 0 END),
    last_used_at = now();
END;
$$;
