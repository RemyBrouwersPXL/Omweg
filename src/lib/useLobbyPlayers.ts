import { useEffect, useState } from 'react';

import { fetchLobbyPlayers, type LobbyPlayer } from './lobby';
import { supabase } from './supabase';

type State = { players: LobbyPlayer[]; error: string | null };

// supabase.channel() returns the existing channel for a topic it already knows, so two
// mounted hooks (lobby screen under the radar) must not share one: give each its own.
let instanceCounter = 0;

const byJoinedAt = (a: LobbyPlayer, b: LobbyPlayer) => a.joined_at.localeCompare(b.joined_at);

/**
 * Live player list for a lobby (used by the lobby screen and the radar): subscribes to
 * Realtime changes on `lobby_players` filtered by `lobby_id`, and (re)loads the full
 * snapshot every time the channel joins, so changes missed while disconnected are recovered.
 */
export function useLobbyPlayers(lobbyId: string): State {
  const [state, setState] = useState<State>({ players: [], error: null });

  useEffect(() => {
    let active = true;
    const rows = new Map<string, LobbyPlayer>();
    const publish = () => {
      if (active) setState({ players: [...rows.values()].sort(byJoinedAt), error: null });
    };
    const fail = (message: string) => {
      if (active) setState((s) => ({ ...s, error: message }));
    };

    const loadSnapshot = async () => {
      try {
        const data = await fetchLobbyPlayers(lobbyId);
        rows.clear();
        for (const row of data) rows.set(row.user_id, row);
        publish();
      } catch (e) {
        fail((e as Error).message);
      }
    };

    const channel = supabase
      .channel(`lobby_players:${lobbyId}:${++instanceCounter}`)
      .on<LobbyPlayer>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobby_players', filter: `lobby_id=eq.${lobbyId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            if (payload.old.user_id) rows.delete(payload.old.user_id);
          } else {
            rows.set(payload.new.user_id, payload.new);
          }
          publish();
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') void loadSnapshot();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          fail(err?.message ?? 'Lost live connection to the lobby.');
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  return state;
}
