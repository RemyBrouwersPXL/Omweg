import type { LobbyPlayer } from '@/lib/lobby';

export type { LobbyPlayer, PlayerRole } from '@/lib/lobby';

export type LatLng = { latitude: number; longitude: number };

/** A player's live position; null until their first GPS fix. */
export function positionOf(player: LobbyPlayer): LatLng | null {
  if (player.live_lat == null || player.live_lng == null) return null;
  return { latitude: player.live_lat, longitude: player.live_lng };
}
