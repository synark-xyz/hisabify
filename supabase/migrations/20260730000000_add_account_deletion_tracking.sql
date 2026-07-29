-- Account deletion tracking (30-day grace period) + GDPR/APPI audit trail.
--
-- Two pieces, both consumed by src/hooks/useDataManagement.ts:
--   1. Deletion-request columns on public.users, so a request is durable and
--      cancellable during the 30-day window promised in the Privacy Policy.
--   2. public.audit_log, the record of data-subject actions (export, deletion
--      request) that GDPR Art. 30 expects us to be able to produce.
--
-- NOTE: public.users is keyed to auth by `user_id`, NOT `id` (`id` is a
-- separate surrogate PK). Every policy here matches on user_id.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_deletion_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_deletion_scheduled_for TIMESTAMPTZ;

-- Partial index: the purge job scans only rows with a pending deletion.
CREATE INDEX IF NOT EXISTS idx_users_account_deletion_scheduled_for
  ON public.users (account_deletion_scheduled_for)
  WHERE account_deletion_scheduled_for IS NOT NULL;

-- Data-subject action audit trail.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN (
      'data_export',
      'account_deletion_initiated',
      'account_deletion_cancelled',
      'account_deletion_completed'
    )),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_action
  ON public.audit_log (user_id, action, timestamp DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users may read and append their own audit entries. Deliberately no UPDATE or
-- DELETE policy: an audit trail the subject can rewrite is not an audit trail.
DROP POLICY IF EXISTS "Users can view own audit log" ON public.audit_log;
CREATE POLICY "Users can view own audit log"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit log" ON public.audit_log;
CREATE POLICY "Users can insert own audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
