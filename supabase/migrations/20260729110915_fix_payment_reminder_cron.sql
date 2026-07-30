-- ============================================================
-- Fix the daily payment-reminder tick
--
-- The `daily-payment-reminders` cron job already existed on the project but had
-- never been captured in a migration, so it was invisible in the repo. It also
-- had never once succeeded: 134/134 runs from 2026-03-18 to 2026-07-29 failed with
--
--   ERROR: unrecognized configuration parameter "app.settings.service_role_key"
--
-- `current_setting('app.settings.<x>')` is a self-hosted / older-docs pattern. On
-- managed Supabase that GUC is not set, so the whole command aborted before
-- net.http_post was ever reached and no reminder was ever delivered.
--
-- Credentials now come from Vault. The job command below holds only secret
-- *names*, never values — cron.job.command is readable by anything with DB
-- access, so a `'Bearer <key>'` literal there would be a standing key leak.
--
-- ── One-time operator setup (per environment, run once; NOT in version control) ──
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co', 'project_url',
--     'Base URL used by cron jobs to reach edge functions');
--
--   select vault.create_secret(
--     '<service-role-key>', 'service_role_key',
--     'Service-role key used by cron jobs to authenticate to edge functions');
--
-- To rotate later, use vault.update_secret(id, new_secret) — the job needs no
-- change, because it resolves the secret at every run.
-- ============================================================

-- pg_cron and pg_net are already installed on this project (pg_cron 1.6.4 in
-- pg_catalog, pg_net 0.19.5 exposing net.http_post). Guarded so a fresh
-- environment provisions identically.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── Reschedule ────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-payment-reminders') then
    perform cron.unschedule('daily-payment-reminders');
  end if;
end $$;

select cron.schedule(
  'daily-payment-reminders',
  '0 8 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/schedule-payment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ── Deploy-time guard ─────────────────────────────────────────────────────────
-- Fail loudly here rather than silently at 08:00 UTC. Missing secrets would make
-- url/headers NULL, which surfaces only as another opaque cron.job_run_details row.
do $$
declare
  v_missing text[];
begin
  select array_agg(n) into v_missing
  from unnest(array['project_url', 'service_role_key']) as n
  where not exists (select 1 from vault.decrypted_secrets where name = n);

  if v_missing is not null then
    raise warning
      '[payment-reminders] cron rescheduled but Vault secret(s) % are missing — the job will fail until vault.create_secret() is run (see header of this migration).',
      v_missing;
  end if;
exception
  -- This block is a diagnostic, not a precondition. If the deploying role cannot
  -- read the Vault view, say so and carry on rather than failing the migration.
  when others then
    raise warning '[payment-reminders] could not verify Vault secrets (%) — check them manually.', sqlerrm;
end $$;
