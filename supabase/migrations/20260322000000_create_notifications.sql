-- In-app notifications (replaces localStorage-based storage)
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  type        text not null,
  title       text not null,
  description text not null default '',
  amount      numeric,
  percentage  numeric,
  deep_link   text,
  image       text,
  metadata    jsonb,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Performance index for listing user notifications in reverse-chronological order
create index idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- Index for unread count queries
create index idx_notifications_user_unread
  on public.notifications (user_id)
  where read = false;

-- Row Level Security
alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Auto-cleanup: keep only the most recent 100 notifications per user
-- Runs as a trigger after each insert
create or replace function public.trim_old_notifications()
returns trigger as $$
begin
  delete from public.notifications
  where id in (
    select id from public.notifications
    where user_id = NEW.user_id
    order by created_at desc
    offset 100
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_trim_old_notifications
  after insert on public.notifications
  for each row
  execute function public.trim_old_notifications();
