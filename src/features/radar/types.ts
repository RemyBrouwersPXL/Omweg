export type PlayerRole = 'hunter' | 'runner';

/** Row shape of the `lobby_players` table. Coordinates are null until the player's first GPS fix. */
export type LobbyPlayer = {
  id: string;
  lobby_id: string;
  user_id: string;
  role: PlayerRole;
  latitude: number | null;
  longitude: number | null;
};

export type LatLng = { latitude: number; longitude: number };

export function positionOf(player: LobbyPlayer): LatLng | null {
  if (player.latitude == null || player.longitude == null) return null;
  return { latitude: player.latitude, longitude: player.longitude };
}
