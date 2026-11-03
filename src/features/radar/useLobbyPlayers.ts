import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import type { LobbyPlayer } from './types';

type State = { players: LobbyPlayer[]; error: string | null };

/**
 * Live list of players in a lobby: subscribes to Realtime changes on `lobby_players`
 * filtered by `lobby_id`, and (re)loads the full snapshot every time the channel joins,
 * so changes missed while disconnected are recovered on reconnect.
 */
export function useLobbyPlayers(lobbyId: string): State {
  const [state, setState] = useState<State>({ players: [], error: null });

  useEffect(() => {
    let active = true;
    const rows = new Map<string, LobbyPlayer>();
    const publish = () => {
      if (active) setState({ players: [...rows.values()], error: null });
    };
    const fail = (message: string) => {
      if (active) setState((s) => ({ ...s, error: message }));
    };

    const loadSnapshot = async () => {
      const { data, error } = await supabase.from('lobby_players').select('*').eq('lobby_id', lobbyId);
      if (error) return fail(error.message);
      rows.clear();
      for (const row of data as LobbyPlayer[]) rows.set(row.user_id, row);
      publish();
    };

    const channel = supabase
      .channel(`lobby_players:${lobbyId}`)
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
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fail(err?.message ?? `Realtime ${status}`);
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  return state;
}
