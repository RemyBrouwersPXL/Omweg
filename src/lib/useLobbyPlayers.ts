import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { fetchLobbyPlayers, type LobbyPlayer } from './lobby';
import { supabase } from './supabase';

function upsertPlayer(players: LobbyPlayer[], player: LobbyPlayer): LobbyPlayer[] {
  const others = players.filter((p) => p.user_id !== player.user_id);
  return [...others, player].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
}

/** Live player list for a lobby: initial fetch plus Realtime inserts/updates. */
export function useLobbyPlayers(lobbyId: string) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const handleChange = (payload: RealtimePostgresChangesPayload<LobbyPlayer>) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setPlayers((current) => upsertPlayer(current, payload.new));
      }
    };

    const channel = supabase
      .channel(`lobby_players:${lobbyId}`)
      .on<LobbyPlayer>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lobby_players', filter: `lobby_id=eq.${lobbyId}` },
        handleChange,
      )
      .on<LobbyPlayer>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lobby_players', filter: `lobby_id=eq.${lobbyId}` },
        handleChange,
      )
      .subscribe((status, err) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          // Fetch after subscribing so no join between fetch and subscribe is missed.
          fetchLobbyPlayers(lobbyId)
            .then((initial) => {
              if (!active) return;
              setPlayers((current) => current.reduce(upsertPlayer, initial));
              setError(null);
            })
            .catch((e: Error) => active && setError(e.message));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError(err?.message ?? 'Lost live connection to the lobby.');
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  return { players, error };
}
