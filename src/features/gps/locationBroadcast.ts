import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '@/lib/supabase';

/**
 * GPS broadcast for active lobbies.
 *
 * One code path for foreground and background: an Android foreground service
 * (persistent notification) delivers a fix every ~3 s to a TaskManager task,
 * which writes the newest fix to `lobby_players`. The task must be defined at
 * module top level, so this file is imported from the root layout (src/app/_layout.tsx).
 */

const TASK_NAME = 'omweg-gps-broadcast';
const BROADCAST_INTERVAL_MS = 3_000;
/** Fixes worse than this are network/cell guesses after GPS dropped; don't broadcast them. */
const MAX_ACCURACY_M = 50;
/** Background safety net: realtime can die while backgrounded, so re-check lobby status. */
const STATUS_RECHECK_MS = 30_000;

/** The lobby_players row to write: its primary key is (lobby_id, user_id). */
export type BroadcastSession = { lobbyId: string; userId: string };

export type BroadcastStatus = {
  /** Timestamp (ms) of the last accepted fix. Stale means the GPS signal is lost. */
  lastFixAt: number | null;
  /** Last fix or write problem; cleared by the next successful write. */
  error: string | null;
};

// In-memory only. The service dies with the app (killServiceOnDestroy), so a
// task firing without a session is an orphan and stops itself.
let session: BroadcastSession | null = null;
let writeInFlight = false;
let lastStatusCheckAt = 0;
let status: BroadcastStatus = { lastFixAt: null, error: null };
const listeners = new Set<(s: BroadcastStatus) => void>();

function setStatus(patch: Partial<BroadcastStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

export function subscribeBroadcastStatus(listener: (s: BroadcastStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export async function isLobbyActive(lobbyId: string): Promise<boolean> {
  const { data, error } = await supabase.from('lobbies').select('status').eq('id', lobbyId).single();
  if (error) throw error;
  return data.status === 'active';
}

/** Must be called while the app is in the foreground (Android foreground-service rule). */
export async function startBroadcast(next: BroadcastSession): Promise<void> {
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Location services are turned off.');
  }
  session = next;
  lastStatusCheckAt = Date.now();
  setStatus({ lastFixAt: null, error: null });

  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) return;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    // High = GPS. Balanced (~100 m) is too coarse to hunt someone down.
    accuracy: Location.Accuracy.High,
    timeInterval: BROADCAST_INTERVAL_MS,
    distanceInterval: 0,
    // Prompts the user to switch location / high accuracy on if needed.
    mayShowUserSettingsDialog: true,
    foregroundService: {
      notificationTitle: 'Manhunt in progress',
      notificationBody: 'Sharing your location with your lobby.',
      killServiceOnDestroy: true,
    },
  });
}

export async function stopBroadcast(): Promise<void> {
  session = null;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
}

async function handleLocations(locations: Location.LocationObject[]) {
  const current = session;
  if (!current) {
    await stopBroadcast();
    return;
  }

  // Android may batch fixes; only the newest matters.
  const fix = locations[locations.length - 1];
  if (!fix) return;
  if (fix.mocked) {
    setStatus({ error: 'Mock location detected; not broadcasting.' });
    return;
  }
  if (fix.coords.accuracy != null && fix.coords.accuracy > MAX_ACCURACY_M) {
    // Weak signal: keep the last good position on the server rather than a bad guess.
    // Other players can see staleness through location_updated_at.
    return;
  }
  setStatus({ lastFixAt: fix.timestamp });

  // Drop instead of queueing when the network is slow: the next fix is fresher.
  if (writeInFlight) return;
  writeInFlight = true;
  try {
    if (Date.now() - lastStatusCheckAt > STATUS_RECHECK_MS) {
      lastStatusCheckAt = Date.now();
      if (!(await isLobbyActive(current.lobbyId))) {
        await stopBroadcast();
        return;
      }
    }

    const { error } = await supabase
      .from('lobby_players')
      .update({
        live_lat: fix.coords.latitude,
        live_lng: fix.coords.longitude,
        location_updated_at: new Date(fix.timestamp).toISOString(),
      })
      .eq('user_id', current.userId)
      .eq('lobby_id', current.lobbyId);
    setStatus({ error: error ? error.message : null });
  } catch (e) {
    // Offline or transient failure: the next fix retries.
    setStatus({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    writeInFlight = false;
  }
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  if (error) {
    setStatus({ error: error.message });
    return;
  }
  if (data?.locations) await handleLocations(data.locations);
});
