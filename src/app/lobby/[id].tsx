import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { Button, ErrorText } from '@/components/ui';
import { useGpsBroadcast } from '@/features/gps/useGpsBroadcast';
import { fetchLobby, startLobby, type Lobby } from '@/lib/lobby';
import { supabase } from '@/lib/supabase';
import { useLobbyPlayers } from '@/lib/useLobbyPlayers';

export default function LobbyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLobby(id)
      .then((l) => active && setLobby(l))
      .catch((e: Error) => active && setLobbyError(e.message));
    supabase.auth
      .getSession()
      .then(({ data }) => active && setUserId(data.session?.user.id ?? null));
    return () => {
      active = false;
    };
  }, [id]);

  if (lobbyError) {
    return (
      <View className="flex-1 justify-center bg-zinc-950 px-6">
        <ErrorText message={lobbyError} />
      </View>
    );
  }

  if (!lobby || !userId) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    );
  }

  return <LobbyView lobby={lobby} userId={userId} />;
}

/**
 * Mounted for as long as the player is in the lobby (the radar is pushed on top of it),
 * so the GPS broadcast runs for the whole game and stops when the player leaves.
 */
function LobbyView({ lobby, userId }: { lobby: Lobby; userId: string }) {
  const { players, error: playersError } = useLobbyPlayers(lobby.id);
  const gps = useGpsBroadcast(lobby.id, userId);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const openedRadar = useRef(false);

  const isHost = lobby.host_id === userId;
  const self = players.find((p) => p.user_id === userId);

  const openRadar = () => router.push({ pathname: '/radar/[lobbyId]', params: { lobbyId: lobby.id } });

  // Everyone jumps to the radar once the host starts the game.
  useEffect(() => {
    if (gps.active && !openedRadar.current) {
      openedRadar.current = true;
      openRadar();
    }
    // openRadar only depends on lobby.id, which is stable for this view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.active]);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await startLobby(lobby.id);
    } catch (e) {
      setStartError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const subtitle = gps.active
    ? `Game on — you are ${self?.role === 'hunter' ? 'the HUNTER' : 'a RUNNER'}`
    : isHost
      ? 'Share this code with your players'
      : 'Waiting for the host to start';

  return (
    <View className="flex-1 bg-zinc-950 px-6 pt-8">
      <Text className="text-center text-sm uppercase tracking-widest text-zinc-400">Lobby code</Text>
      <Text
        selectable
        accessibilityLabel={`Lobby code ${lobby.code.split('').join(' ')}`}
        className="mb-2 text-center text-6xl font-bold tracking-[12px] text-white"
      >
        {lobby.code}
      </Text>
      <Text className="mb-8 text-center text-zinc-400">{subtitle}</Text>

      <ErrorText message={playersError} />
      <ErrorText message={gps.error} />
      {gps.signalLost && <ErrorText message="GPS signal lost — move to open sky." />}

      <Text className="mb-3 text-lg font-semibold text-white">Players ({players.length})</Text>
      <FlatList
        data={players}
        keyExtractor={(p) => p.user_id}
        contentContainerClassName="gap-2 pb-8"
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
            <Text className="text-base text-white">
              {item.display_name}
              {item.user_id === userId ? ' (you)' : ''}
            </Text>
            {item.user_id === lobby.host_id && (
              <Text className="text-xs font-semibold uppercase text-emerald-400">Host</Text>
            )}
          </View>
        )}
      />

      <View className="gap-3 pb-8">
        <ErrorText message={startError} />
        {gps.active ? (
          <Button label="Open radar" onPress={openRadar} />
        ) : (
          isHost && (
            <Button
              label="Start game"
              onPress={handleStart}
              loading={starting}
              disabled={players.length < 2}
            />
          )
        )}
      </View>
    </View>
  );
}
