import { Camera, Map, ViewAnnotation, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { findCatches } from './geo';
import { positionOf, type LobbyPlayer, type PlayerRole } from './types';
import { useLobbyPlayers } from '@/lib/useLobbyPlayers';

// Free OpenStreetMap raster tiles — no API key. Attribution is required by the OSM tile policy.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
};

const ROLE_COLOR: Record<PlayerRole, string> = { hunter: '#D7263D', runner: '#1B98E0', unassigned: '#71717A' };

type Props = { lobbyId: string; userId: string };

export function RadarScreen({ lobbyId, userId }: Props) {
  const { players, error } = useLobbyPlayers(lobbyId);
  const self = players.find((p) => p.user_id === userId);
  const selfPos = self ? positionOf(self) : null;
  const others = players.filter((p) => p.user_id !== userId);
  const catches = useMemo(() => (self ? findCatches(self, players) : []), [self, players]);

  return (
    <View style={styles.container}>
      <Map style={StyleSheet.absoluteFill} mapStyle={OSM_STYLE} attribution logo={false}>
        {/* Mounted on the first fix so the map opens on the player rather than at 0,0. */}
        {selfPos && (
          <Camera initialViewState={{ center: [selfPos.longitude, selfPos.latitude], zoom: 17 }} />
        )}
        {self && selfPos && (
          <PlayerMarker player={self} isSelf lngLat={[selfPos.longitude, selfPos.latitude]} />
        )}
        {others.map((p) => {
          const pos = positionOf(p);
          return pos && <PlayerMarker key={p.user_id} player={p} lngLat={[pos.longitude, pos.latitude]} />;
        })}
      </Map>

      {catches.length > 0 && self && (
        <View style={styles.catchBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.catchTitle}>CATCH ALERT</Text>
          <Text style={styles.catchText}>
            {self.role === 'hunter' ? 'Runner' : 'Hunter'} {catches[0].distanceM.toFixed(1)} m away
            {catches.length > 1 ? ` (+${catches.length - 1} more)` : ''}
          </Text>
        </View>
      )}

      {(error || !self) && (
        <View style={styles.status}>
          <Text style={styles.statusText}>{error ?? 'Waiting for your position…'}</Text>
        </View>
      )}
    </View>
  );
}

type MarkerProps = { player: LobbyPlayer; lngLat: [number, number]; isSelf?: boolean };

function PlayerMarker({ player, lngLat, isSelf = false }: MarkerProps) {
  const color = ROLE_COLOR[player.role];
  return (
    <ViewAnnotation id={`player-${player.user_id}`} lngLat={lngLat} anchor="center">
      <View
        collapsable={false}
        accessibilityLabel={`${isSelf ? 'You' : player.role}`}
        style={[
          styles.marker,
          { backgroundColor: color },
          player.role === 'hunter' ? styles.hunterShape : styles.runnerShape,
          isSelf && styles.selfMarker,
        ]}
      >
        <Text style={styles.markerText}>{isSelf ? '★' : { hunter: 'H', runner: 'R', unassigned: '?' }[player.role]}</Text>
      </View>
    </ViewAnnotation>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5E3DF' },
  marker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Shape differs by role as well as color, so roles stay distinguishable without color vision.
  hunterShape: { borderRadius: 6 },
  runnerShape: { borderRadius: 15 },
  selfMarker: { width: 36, height: 36, borderWidth: 4, borderColor: '#111111' },
  markerText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  catchBanner: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#D7263D',
    alignItems: 'center',
  },
  catchTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  catchText: { color: '#FFFFFF', fontSize: 16, marginTop: 4 },
  status: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  statusText: { color: '#FFFFFF' },
});
