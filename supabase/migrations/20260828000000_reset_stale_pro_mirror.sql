-- Reset the two `public.users` rows left permanently stale by the upgrade-only entitlement sync.
--
-- `syncPremiumToSupabase` used to write only 'pro'/'active' and never a downgrade, so a sandbox
-- subscription that expired on 2026-08-28 left those rows claiming an active Pro subscription
-- forever. `isPremium` always reads live RevenueCat state, so nothing user-facing broke, but the
-- column is a mirror and anything trusting it (reports, emails, admin views) reads a
-- subscription that no longer exists. The hook now writes both directions; this repairs the
-- rows that predate the fix.
--
-- Deliberately narrow: only these accounts, and only rows still marked pro. Genuine paying
-- customers are re-synced from live RevenueCat state on their next app launch.
--
-- `lower(btrim(email))` because an exact `IN (...)` match silently no-ops on a differently
-- cased or space-padded address — and a migration that quietly updates zero rows looks
-- identical to one that worked. Emails are case-insensitive in practice; Postgres `=` is not.

UPDATE public.users
SET subscription_type = 'base',
    subscription_status = 'inactive',
    updated_at = NOW()
WHERE lower(btrim(email)) IN ('coxshebatech@gmail.com', 'sam103043@gmail.com')
  AND subscription_type = 'pro';
