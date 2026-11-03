-- Lobby system: lobbies + lobby_players, RLS, join/create RPCs, Realtime.
-- Requires "Anonymous sign-ins" enabled in Supabase Auth (the app signs users in anonymously).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.lobbies (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[A-Z0-9]{5}$'),
  host_id    uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_at timestamptz not null default now()
);

create table public.lobby_players (
  lobby_id     uuid not null references public.lobbies (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 20),
  role         text not null default 'unassigned' check (role in ('unassigned', 'hunter', 'runner')),
  live_lat     double precision check (live_lat between -90 and 90),
  live_lng     double precision check (live_lng between -180 and 180),
  joined_at    timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index lobby_players_user_id_idx on public.lobby_players (user_id);
create index lobbies_host_id_idx on public.lobbies (host_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function public.is_lobby_member(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lobby_players
    where lobby_id = p_lobby_id and user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Inserts happen only through create_lobby / join_lobby below, so there are
-- no insert policies (denied by default).
-- ---------------------------------------------------------------------------

alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;

create policy "Members can view their lobby"
  on public.lobbies for select to authenticated
  using (host_id = (select auth.uid()) or public.is_lobby_member(id));

create policy "Host can update their lobby"
  on public.lobbies for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "Host can delete their lobby"
  on public.lobbies for delete to authenticated
  using (host_id = (select auth.uid()));

create policy "Members can view players in their lobby"
  on public.lobby_players for select to authenticated
  using (public.is_lobby_member(lobby_id));

create policy "Players can update their own row"
  on public.lobby_players for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Players can leave, host can remove players"
  on public.lobby_players for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.lobbies l
      where l.id = lobby_id and l.host_id = (select auth.uid())
    )
  );

-- Column-level limits: hosts may only change status; players may only move
-- their own position (roles are not self-assignable).
revoke insert, update on public.lobbies from anon, authenticated;
revoke insert, update on public.lobby_players from anon, authenticated;
grant update (status) on public.lobbies to authenticated;
grant update (live_lat, live_lng) on public.lobby_players to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Creates a lobby with a client-generated code and adds the host as a player,
-- atomically. Raises unique_violation (23505) if the code is taken.
create function public.create_lobby(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
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

-- Joins a waiting lobby by code. Idempotent: re-joining returns the same lobby.
create function public.join_lobby(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lobby_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select id into v_lobby_id
  from public.lobbies
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

revoke execute on function public.create_lobby(text, text) from public, anon;
revoke execute on function public.join_lobby(text, text) from public, anon;
revoke execute on function public.is_lobby_member(uuid) from public, anon;
grant execute on function public.create_lobby(text, text) to authenticated;
grant execute on function public.join_lobby(text, text) to authenticated;
grant execute on function public.is_lobby_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes respects the select policies above)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.lobby_players;
