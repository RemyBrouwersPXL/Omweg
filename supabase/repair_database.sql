-- Repair script: brings an out-of-sync Supabase database in line with
-- supabase/migrations/*. Safe to run more than once.
-- Run it in Supabase Dashboard > SQL Editor > New query > Run.

-- ===========================================================================
-- 1. quests table (missing columns such as "minutes")
-- ===========================================================================
-- Older hand-made schema used different column names: rename them (keeps data).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='duration')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='minutes') then
    alter table public.quests rename column duration to minutes;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='lobby_players' and column_name='latitude')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='lobby_players' and column_name='live_lat') then
    alter table public.lobby_players rename column latitude to live_lat;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='lobby_players' and column_name='longitude')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='lobby_players' and column_name='live_lng') then
    alter table public.lobby_players rename column longitude to live_lng;
  end if;
end $$;

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid()
);

alter table public.quests add column if not exists user_id      uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.quests add column if not exists title        text;
alter table public.quests add column if not exists description  text;
alter table public.quests add column if not exists xp           integer not null default 25;
alter table public.quests add column if not exists minutes      integer not null default 15;
alter table public.quests add column if not exists status       text not null default 'accepted';
alter table public.quests add column if not exists accepted_at  timestamptz not null default now();
alter table public.quests add column if not exists completed_at timestamptz;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='created_at') then
    update public.quests set accepted_at = created_at where created_at is not null and accepted_at is distinct from created_at
      and accepted_at > created_at;
  end if;
end $$;

alter table public.quests alter column user_id set default auth.uid();

alter table public.quests drop constraint if exists quests_minutes_check;
alter table public.quests add constraint quests_minutes_check check (minutes between 1 and 240);
alter table public.quests drop constraint if exists quests_xp_check;
alter table public.quests add constraint quests_xp_check check (xp between 0 and 1000);
alter table public.quests drop constraint if exists quests_status_check;
alter table public.quests add constraint quests_status_check check (status in ('accepted', 'completed'));

create index if not exists quests_user_accepted_idx on public.quests (user_id, accepted_at desc);
alter table public.quests enable row level security;

drop policy if exists "Users read own quests" on public.quests;
drop policy if exists "Users insert own quests" on public.quests;
drop policy if exists "Users update own quests" on public.quests;
create policy "Users read own quests" on public.quests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users insert own quests" on public.quests
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own quests" on public.quests
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ===========================================================================
-- 2. Lobby system (create_lobby / join_lobby were missing)
-- ===========================================================================
create table if not exists public.lobbies (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[A-Z0-9]{5}$'),
  host_id    uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.lobby_players (
  lobby_id     uuid not null references public.lobbies (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 20),
  role         text not null default 'unassigned' check (role in ('unassigned', 'hunter', 'runner')),
  live_lat     double precision check (live_lat between -90 and 90),
  live_lng     double precision check (live_lng between -180 and 180),
  joined_at    timestamptz not null default now(),
  primary key (lobby_id, user_id)
);
-- Tables may already exist in an older shape: add whatever is missing.
alter table public.lobbies add column if not exists code       text;
alter table public.lobbies add column if not exists host_id    uuid references auth.users (id) on delete cascade;
alter table public.lobbies add column if not exists status     text not null default 'waiting';
alter table public.lobbies add column if not exists created_at timestamptz not null default now();
create unique index if not exists lobbies_code_key on public.lobbies (code);

alter table public.lobby_players add column if not exists lobby_id     uuid references public.lobbies (id) on delete cascade;
alter table public.lobby_players add column if not exists user_id      uuid references auth.users (id) on delete cascade;
alter table public.lobby_players add column if not exists display_name text not null default 'Player';
alter table public.lobby_players add column if not exists role         text not null default 'unassigned';
alter table public.lobby_players add column if not exists live_lat     double precision;
alter table public.lobby_players add column if not exists live_lng     double precision;
alter table public.lobby_players add column if not exists joined_at    timestamptz not null default now();
alter table public.lobby_players add column if not exists location_updated_at timestamptz;
-- needed for "on conflict (lobby_id, user_id)" in join_lobby
create unique index if not exists lobby_players_lobby_user_key on public.lobby_players (lobby_id, user_id);

create index if not exists lobby_players_user_id_idx on public.lobby_players (user_id);
create index if not exists lobbies_host_id_idx on public.lobbies (host_id);

-- Old versions of these functions had other parameter names; drop them first.
-- (cascade also drops policies that use is_lobby_member; they are recreated below)
drop function if exists public.create_lobby(text, text) cascade;
drop function if exists public.join_lobby(text, text) cascade;
drop function if exists public.start_lobby(uuid) cascade;
drop function if exists public.is_lobby_member(uuid) cascade;

create or replace function public.is_lobby_member(p_lobby_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lobby_players
    where lobby_id = p_lobby_id and user_id = (select auth.uid())
  );
$$;

alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;

drop policy if exists "Members can view their lobby" on public.lobbies;
drop policy if exists "Host can update their lobby" on public.lobbies;
drop policy if exists "Host can delete their lobby" on public.lobbies;
drop policy if exists "Members can view players in their lobby" on public.lobby_players;
drop policy if exists "Players can update their own row" on public.lobby_players;
drop policy if exists "Players can leave, host can remove players" on public.lobby_players;

create policy "Members can view their lobby"
  on public.lobbies for select to authenticated
  using (host_id = (select auth.uid()) or public.is_lobby_member(id));
create policy "Host can update their lobby"
  on public.lobbies for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "Host can delete their lobby"
  on public.lobbies for delete to authenticated
  using (host_id = (select auth.uid()));
create policy "Members can view players in their lobby"
  on public.lobby_players for select to authenticated
  using (public.is_lobby_member(lobby_id));
create policy "Players can update their own row"
  on public.lobby_players for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Players can leave, host can remove players"
  on public.lobby_players for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.lobbies l where l.id = lobby_id and l.host_id = (select auth.uid()))
  );

revoke insert, update on public.lobbies from anon, authenticated;
revoke insert, update on public.lobby_players from anon, authenticated;
grant update (status) on public.lobbies to authenticated;
grant update (live_lat, live_lng, location_updated_at) on public.lobby_players to authenticated;

create or replace function public.create_lobby(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lobby_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  insert into public.lobbies (code, host_id)
  values (upper(btrim(p_code)), v_uid)
  returning id into v_lobby_id;
  insert into public.lobby_players (lobby_id, user_id, display_name)
  values (v_lobby_id, v_uid, btrim(p_display_name));
  return v_lobby_id;
end;
$$;

create or replace function public.join_lobby(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lobby_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select id into v_lobby_id from public.lobbies
  where code = upper(btrim(p_code)) and status = 'waiting';
  if v_lobby_id is null then
    raise exception 'Lobby not found or already started' using errcode = 'P0002';
  end if;
  insert into public.lobby_players (lobby_id, user_id, display_name)
  values (v_lobby_id, v_uid, btrim(p_display_name))
  on conflict (lobby_id, user_id) do nothing;
  return v_lobby_id;
end;
$$;

-- GPS broadcast + game start
create or replace function public.lobby_players_location_only_when_active()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.live_lat is not null
     and (new.live_lat is distinct from old.live_lat or new.live_lng is distinct from old.live_lng)
     and not exists (select 1 from public.lobbies l where l.id = new.lobby_id and l.status = 'active') then
    raise exception 'Location updates are only allowed while the lobby is active';
  end if;
  return new;
end;
$$;

drop trigger if exists lobby_players_location_only_when_active on public.lobby_players;
create trigger lobby_players_location_only_when_active
  before update on public.lobby_players
  for each row execute function public.lobby_players_location_only_when_active();

create or replace function public.start_lobby(p_lobby_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform 1 from public.lobbies
  where id = p_lobby_id and host_id = v_uid and status = 'waiting'
  for update;
  if not found then
    raise exception 'Only the host can start a waiting lobby' using errcode = '42501';
  end if;
  if (select count(*) from public.lobby_players where lobby_id = p_lobby_id) < 2 then
    raise exception 'At least 2 players are needed to start' using errcode = 'P0001';
  end if;
  update public.lobby_players set role = 'runner' where lobby_id = p_lobby_id;
  update public.lobby_players set role = 'hunter'
  where lobby_id = p_lobby_id
    and user_id = (select user_id from public.lobby_players where lobby_id = p_lobby_id order by random() limit 1);
  update public.lobbies set status = 'active' where id = p_lobby_id;
end;
$$;

revoke execute on function public.create_lobby(text, text) from public, anon;
revoke execute on function public.join_lobby(text, text) from public, anon;
revoke execute on function public.is_lobby_member(uuid) from public, anon;
revoke execute on function public.start_lobby(uuid) from public, anon;
grant execute on function public.create_lobby(text, text) to authenticated;
grant execute on function public.join_lobby(text, text) to authenticated;
grant execute on function public.is_lobby_member(uuid) to authenticated;
grant execute on function public.start_lobby(uuid) to authenticated;

-- Realtime (skip tables that are already published)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lobby_players') then
    alter publication supabase_realtime add table public.lobby_players;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lobbies') then
    alter publication supabase_realtime add table public.lobbies;
  end if;
end $$;

-- Make the API see the new columns/functions immediately ("schema cache" errors)
notify pgrst, 'reload schema';
