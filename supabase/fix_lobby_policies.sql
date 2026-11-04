-- Fix "infinite recursion detected in policy for relation lobby_players".
-- Old hand-made policies were still active next to the new ones; one of them
-- queries lobby_players from inside a lobby_players policy. This removes ALL
-- policies on the lobby tables and recreates only the correct set.

do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('lobbies', 'lobby_players')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Membership check runs as the function owner, so it bypasses RLS (no recursion).
create or replace function public.is_lobby_member(p_lobby_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lobby_players
    where lobby_id = p_lobby_id and user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_lobby_member(uuid) from public, anon;
grant execute on function public.is_lobby_member(uuid) to authenticated;

alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;

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
  using (user_id = (select auth.uid()) or public.is_lobby_member(lobby_id));
create policy "Players can update their own row"
  on public.lobby_players for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Players can leave, host can remove players"
  on public.lobby_players for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.lobbies l where l.id = lobby_id and l.host_id = (select auth.uid()))
  );

notify pgrst, 'reload schema';
