import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import {
  BroadcastStatus,
  isLobbyActive,
  startBroadcast,
  stopBroadcast,
  subscribeBroadcastStatus,
} from './locationBroadcast';
import { getLocationAccess } from './permissions';

/** No accepted fix for this long means the GPS signal is treated as lost. */
const SIGNAL_LOST_AFTER_MS = 10_000;

export type GpsBroadcastState = {
  /** lobbies.status === 'active', followed live. */
  active: boolean;
  broadcasting: boolean;
  signalLost: boolean;
  error: string | null;
};

/**
 * Broadcasts this player's position only while `lobbies.status === 'active'`.
 * Follows the status through Supabase Realtime; the location task also re-checks
 * it on its own while backgrounded. Ask for permissions first with
 * `requestLocationPermissions()`.
 */
export function useGpsBroadcast(lobbyId: string, userId: string): GpsBroadcastState {
  const [active, setActive] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [status, setStatus] = useState<BroadcastStatus>({ lastFixAt: null, error: null });
  const [now, setNow] = useState(() => Date.now());

  // Track lobby status.
  useEffect(() => {
    let cancelled = false;
    const channel = supabase
      .channel(`lobby-status:${lobbyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        (payload) => setActive((payload.new as { status?: string }).status === 'active'),
      )
      .subscribe((s) => {
        // Read the status after (re)subscribing so a change before/while disconnected isn't missed.
        if (s !== 'SUBSCRIBED') return;
        isLobbyActive(lobbyId)
          .then((a) => {
            if (!cancelled) setActive(a);
          })
          .catch((e: Error) => {
            if (!cancelled) setStartError(e.message);
          });
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  // Start/stop the location service. Android only allows starting the foreground
  // service while the app is visible, so a game that turns active while we're
  // backgrounded starts as soon as the user comes back.
  useEffect(() => {
    if (!active) {
      stopBroadcast().finally(() => setBroadcasting(false));
      return;
    }

    let cancelled = false;
    const tryStart = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        if ((await getLocationAccess()) === 'denied') {
          throw new Error('Precise location permission is required to play.');
        }
        await startBroadcast({ lobbyId, userId });
        if (!cancelled) {
          setBroadcasting(true);
          setStartError(null);
        }
      } catch (e) {
        if (!cancelled) setStartError(e instanceof Error ? e.message : String(e));
      }
    };

    tryStart();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tryStart();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [active, lobbyId, userId]);

  // Leaving the screen that uses the hook (leaving the lobby) stops the broadcast.
  useEffect(
    () => () => {
      stopBroadcast();
    },
    [],
  );

  useEffect(() => subscribeBroadcastStatus(setStatus), []);

  // Clock for signal-lost detection, only while broadcasting.
  useEffect(() => {
    if (!broadcasting) return;
    const id = setInterval(() => setNow(Date.now()), 2_000);
    return () => clearInterval(id);
  }, [broadcasting]);

  const signalLost =
    broadcasting && (status.lastFixAt === null || now - status.lastFixAt > SIGNAL_LOST_AFTER_MS);

  return { active, broadcasting, signalLost, error: startError ?? status.error };
}
