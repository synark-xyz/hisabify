-- ============================================================
-- Materialise recurring_expenses templates into real transactions.
--
-- The recurring_expenses table has existed since 20260117155345 with frequency,
-- next_due_date, last_created_date, is_active, RLS and four indexes — a finished
-- schema with nothing ever attached to it. This is the missing half: the tick
-- that turns a template into transactions and advances its cursor.
--
-- Runs two ways, deliberately:
--   • pg_cron, nightly, no JWT       → auth.uid() is null → processes every user
--   • the client, via rpc()          → auth.uid() is set  → processes only the caller
-- The single `auth.uid() is null or user_id = auth.uid()` clause covers both, so an
-- authenticated caller can never materialise another user's templates even though
-- the function is SECURITY DEFINER. It also means recurring keeps working when the
-- cron is down — which is not hypothetical here; the reminder cron was dead for
-- four months before anyone noticed.
--
-- Idempotency comes from advancing next_due_date in the same transaction as the
-- insert: a re-run finds nothing due. `for update skip locked` keeps a concurrent
-- cron tick and app open from racing on the same template.
--
-- ── Verification (re-runnable; rolls back, leaves nothing behind) ──────────────
-- Confirmed: 3 rows for the 3 missed periods, cursor advanced one period past the
-- last, last_created_date stamped, and the second call a no-op.
--
--   begin;
--   with u as (
--     select pu.user_id, coalesce(pu.currency,'USD') as currency
--     from public.users pu join auth.users au on au.id = pu.user_id
--     order by pu.created_at limit 1
--   )
--   insert into public.recurring_expenses
--     (user_id, title, amount, currency, frequency, start_date, next_due_date)
--   select u.user_id, 'ZZ_TEST', 15.99, u.currency, 'monthly',
--          now() - interval '3 months', now() - interval '2 months' from u;
--   do $x$ begin perform public.process_recurring_expenses(); end $x$;
--   do $x$ begin perform public.process_recurring_expenses(); end $x$;  -- must add nothing
--   select (select count(*) from public.transactions where merchant='ZZ_TEST') as tx_rows,
--          (select next_due_date::date from public.recurring_expenses where title='ZZ_TEST');
--   rollback;
--
-- Note public.users.user_id is the auth id; public.users.id is a separate local PK.
-- Joining on public.users.id finds zero rows.
-- ============================================================

create or replace function public.process_recurring_expenses()
returns table (created integer, templates integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_created  integer := 0;
  v_touched  integer := 0;
  v_next     timestamptz;
  v_guard    integer;
  v_step     interval;
begin
  for r in
    select *
    from public.recurring_expenses
    where is_active
      and next_due_date <= now()
      and (auth.uid() is null or user_id = auth.uid())
    for update skip locked
  loop
    v_step := case r.frequency
                when 'daily'   then interval '1 day'
                when 'weekly'  then interval '1 week'
                when 'monthly' then interval '1 month'
                when 'yearly'  then interval '1 year'
                else interval '1 month'
              end;

    v_next  := r.next_due_date;
    v_guard := 0;

    -- Catch up on every period missed since the last run. A template that fell far
    -- behind genuinely did cost money each period, so backfilling is the honest
    -- reading — but bounded, so one neglected daily template cannot emit a year of
    -- rows in a single tick.
    -- ponytail: 24 per run; the residue is picked up by the next tick. Raise it, or
    -- anchor on start_date instead, only if someone actually hits the ceiling.
    while v_next <= now() and v_guard < 24 loop
      insert into public.transactions (
        user_id, card_id, category_id, merchant, amount, type, date, note,
        amount_original, currency_original, exchange_rate, exchange_source,
        tags, status
      ) values (
        r.user_id, r.card_id, r.category_id, r.title, r.amount, 'expense', v_next, r.note,
        -- No conversion here: public.exchange_rates is empty (the app caches rates
        -- in memory client-side), so there is no rate to honestly apply. The UI
        -- creates templates in the user's own currency, which keeps amount and
        -- amount_original the same number.
        r.amount, r.currency, 1, 'recurring',
        array['recurring'], 'cleared'
      );

      v_created := v_created + 1;
      v_next    := v_next + v_step;
      v_guard   := v_guard + 1;
    end loop;

    if v_guard > 0 then
      update public.recurring_expenses
         set next_due_date     = v_next,
             last_created_date = now()
       where id = r.id;
      v_touched := v_touched + 1;
    end if;
  end loop;

  return query select v_created, v_touched;
end;
$$;

-- anon must never reach a SECURITY DEFINER function that writes transactions.
revoke all on function public.process_recurring_expenses() from public, anon;
grant execute on function public.process_recurring_expenses() to authenticated, service_role;

-- ── Nightly tick ──────────────────────────────────────────────────────────────
-- Plain SQL, so unlike the payment-reminder job this needs no HTTP hop, no edge
-- function and no credential of any kind.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'process-recurring-expenses') then
    perform cron.unschedule('process-recurring-expenses');
  end if;
end $$;

select cron.schedule(
  'process-recurring-expenses',
  '5 0 * * *',
  $$ select public.process_recurring_expenses(); $$
);
