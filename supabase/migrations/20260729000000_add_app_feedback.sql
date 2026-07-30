-- App feedback: backs both the in-app star rating prompt and the Settings > Support > Feedback form.
-- One table for both because they share every column that matters (who, what, free text, attachments);
-- `kind` discriminates, and the CHECK constraints keep each shape honest.

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rating', 'feedback')),

  -- rating only: 1-5 stars
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),

  -- feedback only
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'improvement', 'feature_request', 'deletion_request', 'other')),
  -- free-text label the user types when feedback_type = 'other'
  other_label TEXT,

  email TEXT,
  message TEXT,
  attachments TEXT[] NOT NULL DEFAULT '{}',

  -- triage metadata: which build/platform the report came from
  app_version TEXT,
  platform TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- a rating row must carry a star value; a feedback row must carry a type + message
  CONSTRAINT app_feedback_shape CHECK (
    (kind = 'rating' AND rating IS NOT NULL)
    OR (kind = 'feedback' AND feedback_type IS NOT NULL AND message IS NOT NULL)
  )
);

-- "has this user rated?" is the hot query — it runs on app open to decide whether to prompt.
CREATE INDEX IF NOT EXISTS idx_app_feedback_user_kind
  ON public.app_feedback (user_id, kind, created_at DESC);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.app_feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.app_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback" ON public.app_feedback;
CREATE POLICY "Users can view own feedback"
  ON public.app_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- No UPDATE/DELETE policies: submissions are an append-only record.

-- Private bucket for feedback screenshots/files, one folder per user (same shape as `receipts`).
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own feedback attachments" ON storage.objects;
CREATE POLICY "Users can upload own feedback attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'feedback-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own feedback attachments" ON storage.objects;
CREATE POLICY "Users can view own feedback attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feedback-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
