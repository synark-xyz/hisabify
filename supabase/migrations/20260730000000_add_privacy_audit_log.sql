-- GDPR/APPI data-subject audit trail.
--
-- Records the privacy actions a user takes on their own account (data export,
-- account deletion) so we can evidence compliance with the response windows
-- promised in the Privacy Policy. Consumed by src/hooks/useDataManagement.ts
-- and src/pages/profile/DataPage.tsx.
--
-- Deliberately NOT a soft-delete/grace-period mechanism: account deletion in
-- this app is immediate and irreversible (see DataPage -> delete-user edge
-- function), which satisfies the policy's "deleted within 30 days" ceiling.
-- This table only records that it happened.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN (
      'data_export',
      'financial_data_deleted',
      'account_deleted'
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
