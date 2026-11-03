import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/ui';
import {
  DISPLAY_NAME_MAX_LENGTH,
  isValidDisplayName,
  isValidLobbyCode,
  joinLobby,
  LOBBY_CODE_LENGTH,
  normalizeLobbyCode,
} from '@/lib/lobby';

export default function JoinScreen() {
  const params = useLocalSearchParams<{ name?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canJoin = isValidLobbyCode(code) && isValidDisplayName(name) && !joining;

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const lobbyId = await joinLobby(code, name);
      router.replace({ pathname: '/lobby/[id]', params: { id: lobbyId } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-zinc-950 px-6">
      <Field
        label="Your name"
        value={name}
        onChangeText={setName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoCorrect={false}
      />
      <Field
        label="Lobby code"
        value={code}
        onChangeText={(text) => setCode(normalizeLobbyCode(text))}
        placeholder="ABC12"
        maxLength={LOBBY_CODE_LENGTH}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={() => {
          if (canJoin) handleJoin();
        }}
      />
      <ErrorText message={error} />
      <Button label="Join" onPress={handleJoin} disabled={!canJoin} loading={joining} />
    </View>
  );
}
