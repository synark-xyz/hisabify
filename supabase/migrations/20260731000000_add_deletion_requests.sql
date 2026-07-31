-- Manual deletion request queue: the source of truth for the review-gated
-- account/data deletion flow. Nothing in DataPage.tsx deletes data directly
-- any more — it only inserts a pending row here. Fulfilment (the actual wipe)
-- happens in supabase/functions/process-deletion-request, triggered by an
-- admin clicking Approve in /admin. See
-- docs/superpowers/specs/2026-07-30-manual-deletion-requests-design.md.

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  email         TEXT,
  scope         TEXT NOT NULL CHECK (scope IN ('data', 'account')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'cancelled', 'completed')),
  reason        TEXT,
  detail        TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT
);

-- One pending request per user at a time — makes the DataPage banner query
-- single-row and blocks duplicate submissions without any client-side guard.
CREATE UNIQUE INDEX IF NOT EXISTS deletion_requests_one_pending
  ON public.deletion_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status
  ON public.deletion_requests (status, requested_at DESC);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Insert own row, and only ever as 'pending' — a client cannot insert a
-- pre-completed row to bypass review.
DROP POLICY IF EXISTS "Users can request their own deletion" ON public.deletion_requests;
CREATE POLICY "Users can request their own deletion"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Read own rows, or admin reads all (backs the /admin queue).
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.deletion_requests;
CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- The only mutation a user can make: pending -> cancelled. Fulfilment
-- (pending -> completed) is service-role-only, via the edge function, and
-- therefore doesn't need a policy here at all.
DROP POLICY IF EXISTS "Users can cancel their own pending request" ON public.deletion_requests;
CREATE POLICY "Users can cancel their own pending request"
  ON public.deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Extend the existing audit trail with the two new action types this flow
-- writes. The constraint is the default Postgres name for an inline column
-- CHECK (`{table}_{column}_check`) — see
-- supabase/migrations/20260730000000_add_privacy_audit_log.sql for the
-- original definition.
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'data_export',
    'financial_data_deleted',
    'account_deleted',
    'deletion_requested',
    'deletion_request_cancelled'
  ));
