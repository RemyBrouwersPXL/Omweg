-- GPS broadcast + game start, on top of the lobby system (20261103000001).
-- Positions live in lobby_players.live_lat / live_lng (read by the radar).

alter table public.lobby_players
  add column if not exists location_updated_at timestamptz;

grant update (location_updated_at) on public.lobby_players to authenticated;

-- Server-side guarantee: positions can only change while the lobby is active.
-- Clearing them (null) stays allowed, e.g. when a game ends.
create or replace function public.lobby_players_location_only_when_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.live_lat is not null
     and (new.live_lat is distinct from old.live_lat or new.live_lng is distinct from old.live_lng)
     and not exists (
       select 1 from public.lobbies l where l.id = new.lobby_id and l.status = 'active'
     ) then
    raise exception 'Location updates are only allowed while the lobby is active';
  end if;
  return new;
end;
$$;

drop trigger if exists lobby_players_location_only_when_active on public.lobby_players;
create trigger lobby_players_location_only_when_active
  before update on public.lobby_players
  for each row execute function public.lobby_players_location_only_when_active();

-- Host starts the game: assigns one random hunter, everyone else runs, and
-- flips the lobby to 'active' atomically. Roles are not client-writable.
create function public.start_lobby(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
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
    and user_id = (
      select user_id from public.lobby_players
      where lobby_id = p_lobby_id order by random() limit 1
    );

  update public.lobbies set status = 'active' where id = p_lobby_id;
end;
$$;

revoke execute on function public.start_lobby(uuid) from public, anon;
grant execute on function public.start_lobby(uuid) to authenticated;

-- The GPS broadcast and lobby screen follow lobbies.status through Realtime.
alter publication supabase_realtime add table public.lobbies;
