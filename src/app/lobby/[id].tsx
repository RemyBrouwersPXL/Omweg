import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { ErrorText } from '@/components/ui';
import { fetchLobby, type Lobby } from '@/lib/lobby';
import { supabase } from '@/lib/supabase';
import { useLobbyPlayers } from '@/lib/useLobbyPlayers';

export default function LobbyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const { players, error: playersError } = useLobbyPlayers(id);

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

  if (!lobby) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    );
  }

  const isHost = lobby.host_id === userId;

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
      <Text className="mb-8 text-center text-zinc-400">
        {isHost ? 'Share this code with your players' : 'Waiting for the host to start'}
      </Text>

      <ErrorText message={playersError} />
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
    </View>
  );
}
