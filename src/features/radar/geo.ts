import { positionOf, type LatLng, type LobbyPlayer } from './types';

const EARTH_RADIUS_M = 6_371_000;
export const CATCH_RADIUS_M = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters between two coordinates (Haversine formula). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Catch = { enemy: LobbyPlayer; distanceM: number };

/**
 * Enemies of `self` (opposite role) within the catch radius, nearest first.
 * A hunter sees the runners it is catching; a runner sees the hunters catching it.
 */
export function findCatches(self: LobbyPlayer, players: LobbyPlayer[]): Catch[] {
  const selfPos = positionOf(self);
  if (!selfPos || self.role === 'unassigned') return [];
  const catches: Catch[] = [];
  for (const enemy of players) {
    if (enemy.user_id === self.user_id || enemy.role === self.role || enemy.role === 'unassigned') continue;
    const pos = positionOf(enemy);
    if (!pos) continue;
    const distanceM = haversineMeters(selfPos, pos);
    if (distanceM <= CATCH_RADIUS_M) catches.push({ enemy, distanceM });
  }
  return catches.sort((x, y) => x.distanceM - y.distanceM);
}
