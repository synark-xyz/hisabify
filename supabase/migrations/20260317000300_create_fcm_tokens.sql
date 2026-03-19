-- FCM device tokens for push notifications
create table public.fcm_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  token       text not null,
  platform    text not null default 'android',   -- 'android' | 'ios' | 'web'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, token)
);

alter table public.fcm_tokens enable row level security;

create policy "Users manage own tokens"
  on public.fcm_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.fcm_tokens(user_id);
