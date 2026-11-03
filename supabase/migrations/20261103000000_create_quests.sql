-- Side Quests accepted/completed by a user.
-- The app signs users in anonymously (enable "Anonymous sign-ins" under
-- Authentication > Providers), so every row is owned by auth.uid().

create table if not exists public.quests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  description  text not null check (char_length(description) between 1 and 300),
  xp           integer not null check (xp between 0 and 1000),
  minutes      integer not null check (minutes between 1 and 240),
  status       text not null default 'accepted' check (status in ('accepted', 'completed')),
  accepted_at  timestamptz not null default now(),
  completed_at timestamptz,
  constraint completed_has_timestamp check ((status = 'completed') = (completed_at is not null))
);

create index if not exists quests_user_accepted_idx on public.quests (user_id, accepted_at desc);

alter table public.quests enable row level security;

create policy "Users read own quests" on public.quests
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Users insert own quests" on public.quests
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Users update own quests" on public.quests
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
