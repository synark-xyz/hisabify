-- Migration: AI Knowledge Base + Behavior Tracking + Rate Limiting
-- Created: 2026-03-27

-- ============================================================
-- Table 1: ai_receipt_knowledge — App-only, no user RLS
-- Stores anonymized receipt parsing outcomes for AI improvement
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_receipt_knowledge (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_signature  TEXT        UNIQUE,         -- SHA-256 of merchant|amount|date|currency; dedupes re-scans
  script_type        TEXT,                      -- 'latin' | 'arabic' | 'devanagari' | 'han' | 'thai' | 'unknown'
  country_code       TEXT,                      -- inferred from currency/language
  currency           TEXT,                      -- ISO 3-letter code
  merchant_name      TEXT,                      -- normalized merchant (no PII)
  merchant_category  TEXT,                      -- mapped category
  amount_range       TEXT,                      -- 'micro'(<10) | 'small'(10-100) | 'medium'(100-1k) | 'large'(>1k)
  had_tax_line       BOOLEAN     DEFAULT false,
  had_tip_line       BOOLEAN     DEFAULT false,
  had_change_line    BOOLEAN     DEFAULT false,
  ai_confidence      TEXT,                      -- 'high' | 'medium' | 'low'
  ai_raw_response    JSONB,                     -- full parsed JSON from Gemini
  was_corrected      BOOLEAN     DEFAULT false,  -- did user edit after scan?
  user_correction    JSONB,                     -- {field, original, corrected} — no PII
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — accessible only via service_role in edge functions
CREATE INDEX IF NOT EXISTS idx_ai_receipt_knowledge_script      ON public.ai_receipt_knowledge (script_type);
CREATE INDEX IF NOT EXISTS idx_ai_receipt_knowledge_currency    ON public.ai_receipt_knowledge (currency);
CREATE INDEX IF NOT EXISTS idx_ai_receipt_knowledge_confidence  ON public.ai_receipt_knowledge (ai_confidence);
CREATE INDEX IF NOT EXISTS idx_ai_receipt_knowledge_merchant    ON public.ai_receipt_knowledge (merchant_name);

-- ============================================================
-- Table 2: ai_merchant_knowledge — App-only, no user RLS
-- Grows into merchant directory as users scan receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_merchant_knowledge (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name     TEXT        NOT NULL UNIQUE,   -- normalized lowercase
  merchant_display  TEXT,                          -- display-form name
  category          TEXT,                          -- most common category mapped
  currency          TEXT,                          -- typical currency
  country_code      TEXT,
  occurrence_count  INTEGER     NOT NULL DEFAULT 1,
  confidence       NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — app-only
CREATE INDEX IF NOT EXISTS idx_ai_merchant_knowledge_name     ON public.ai_merchant_knowledge (merchant_name);
CREATE INDEX IF NOT EXISTS idx_ai_merchant_knowledge_category ON public.ai_merchant_knowledge (category);

-- ============================================================
-- Table 3: user_behavior_events — Per-user, RLS protected
-- Append-only event stream for future AI Agent analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  event_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  session_id  TEXT,                    -- groups events within one app session
  platform    TEXT,                    -- 'web' | 'android' | 'ios'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only insert/read their own events
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_behavior_events' AND policyname = 'Users can insert own behavior events'
  ) THEN
    CREATE POLICY "Users can insert own behavior events"
      ON public.user_behavior_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_behavior_events' AND policyname = 'Users can view own behavior events'
  ) THEN
    CREATE POLICY "Users can view own behavior events"
      ON public.user_behavior_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- No UPDATE/DELETE — append-only log

-- Performance indexes for AI Agent queries
CREATE INDEX IF NOT EXISTS idx_behavior_events_user_type
  ON public.user_behavior_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_events_user_created
  ON public.user_behavior_events (user_id, created_at DESC);

-- ============================================================
-- Table 4: rate_limits — Per-user API rate limiting
-- Protects Gemini API quota from abuse
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL,
  action       TEXT        NOT NULL,   -- 'receipt_scan' | 'voice_input' | etc.
  count        INTEGER     NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits (user_id, action);

-- ============================================================
-- Function: handle_updated_at — Auto-update updated_at column
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_ai_receipt_knowledge_updated_at ON public.ai_receipt_knowledge;
CREATE TRIGGER set_ai_receipt_knowledge_updated_at
  BEFORE UPDATE ON public.ai_receipt_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_ai_merchant_knowledge_updated_at ON public.ai_merchant_knowledge;
CREATE TRIGGER set_ai_merchant_knowledge_updated_at
  BEFORE UPDATE ON public.ai_merchant_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Function: check_rate_limit — Atomic rate limit check+increment
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id      UUID,
  p_action       TEXT,
  p_limit        INTEGER DEFAULT 20,
  p_window_secs  INTEGER DEFAULT 3600
)
RETURNS JSONB AS $$
DECLARE
  v_record    RECORD;
  v_exceeded  BOOLEAN;
  v_remaining INTEGER;
  v_reset_at  TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_record
  FROM public.rate_limits
  WHERE user_id = p_user_id AND action = p_action;

  IF v_record IS NULL THEN
    -- First request in window
    INSERT INTO public.rate_limits (user_id, action, count, window_start)
    VALUES (p_user_id, p_action, 1, now())
    ON CONFLICT (user_id, action) DO UPDATE SET count = 1, window_start = now();
    v_exceeded := false;
    v_remaining := p_limit - 1;
    v_reset_at := now() + (p_window_secs || ' seconds')::interval;

  ELSIF v_record.window_start < now() - (p_window_secs || ' seconds')::interval THEN
    -- Window expired, reset
    UPDATE public.rate_limits SET count = 1, window_start = now()
    WHERE user_id = p_user_id AND action = p_action;
    v_exceeded := false;
    v_remaining := p_limit - 1;
    v_reset_at := now() + (p_window_secs || ' seconds')::interval;

  ELSIF v_record.count >= p_limit THEN
    -- Rate limit exceeded
    v_exceeded := true;
    v_remaining := 0;
    v_reset_at := v_record.window_start + (p_window_secs || ' seconds')::interval;

  ELSE
    -- Within limit
    UPDATE public.rate_limits SET count = count + 1
    WHERE user_id = p_user_id AND action = p_action;
    v_exceeded := false;
    v_remaining := p_limit - v_record.count - 1;
    v_reset_at := v_record.window_start + (p_window_secs || ' seconds')::interval;
  END IF;

  RETURN jsonb_build_object(
    'exceeded',  v_exceeded,
    'remaining', v_remaining,
    'reset_at',  v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- pg_cron: Nightly auto-trim behavior events
-- Runs at 3am daily — far cheaper than per-INSERT trigger
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trim-old-behavior-events') THEN
    PERFORM cron.unschedule('trim-old-behavior-events');
  END IF;
END $$;
SELECT cron.schedule(
  'trim-old-behavior-events',
  '0 3 * * *',
  $$
    DELETE FROM public.user_behavior_events
    WHERE id IN (
      SELECT id FROM (
        SELECT id, user_id, created_at,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
        FROM public.user_behavior_events
      ) ranked
      WHERE rn > 2000
    );
  $$
);

-- ============================================================
-- Grants for service_role (edge functions use service_role client)
-- ============================================================
ALTER TABLE public.ai_receipt_knowledge  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_merchant_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits           ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS, but these policies ensure service_role has access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_receipt_knowledge' AND policyname = 'service_role can manage ai_receipt_knowledge'
  ) THEN
    CREATE POLICY "service_role can manage ai_receipt_knowledge"
      ON public.ai_receipt_knowledge FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_merchant_knowledge' AND policyname = 'service_role can manage ai_merchant_knowledge'
  ) THEN
    CREATE POLICY "service_role can manage ai_merchant_knowledge"
      ON public.ai_merchant_knowledge FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rate_limits' AND policyname = 'service_role can manage rate_limits'
  ) THEN
    CREATE POLICY "service_role can manage rate_limits"
      ON public.rate_limits FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_behavior_events' AND policyname = 'service_role can read user_behavior_events'
  ) THEN
    CREATE POLICY "service_role can read user_behavior_events"
      ON public.user_behavior_events FOR SELECT
      USING (auth.role() = 'service_role');
  END IF;
END $$;
