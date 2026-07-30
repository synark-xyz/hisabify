-- Admin read access, backing the in-app admin panel at /admin.
--
-- Allowlist by JWT email rather than a users.is_admin column: one developer, one address,
-- so a column + bootstrap UPDATE + types regeneration buys nothing here. Adding an admin is
-- one line in the IN list below.
-- ponytail: email allowlist; move to a users.is_admin column if admins ever outnumber the
-- people who can edit this file.
--
-- Reads no tables, so no SECURITY DEFINER and no RLS recursion to worry about.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') IN ('scode43@gmail.com');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Additive SELECT policies. These OR with the existing "own rows" policies, so a normal
-- user is unaffected; only an allowlisted email widens to the whole table.
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.app_feedback;
CREATE POLICY "Admins can view all feedback"
  ON public.app_feedback FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all behavior events" ON public.user_behavior_events;
CREATE POLICY "Admins can view all behavior events"
  ON public.user_behavior_events FOR SELECT
  USING (public.is_admin());
