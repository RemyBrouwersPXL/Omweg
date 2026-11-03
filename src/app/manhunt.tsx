import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/ui';
import { createLobby, DISPLAY_NAME_MAX_LENGTH, isValidDisplayName } from '@/lib/lobby';

export default function ManhuntScreen() {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameValid = isValidDisplayName(name);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const lobbyId = await createLobby(name);
      router.push({ pathname: '/lobby/[id]', params: { id: lobbyId } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View className="flex-1 justify-center gap-3 bg-zinc-950 px-6">
      {/* Stays mounted under join/lobby, so the whole dark lobby flow gets light status bar icons. */}
      <StatusBar style="light" />
      <Field
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Shadow"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoCorrect={false}
      />
      <ErrorText message={error} />
      <Button label="Host a lobby" onPress={handleCreate} disabled={!nameValid} loading={creating} />
      <Button
        label="Join a lobby"
        variant="secondary"
        disabled={!nameValid || creating}
        onPress={() => router.push({ pathname: '/join', params: { name: name.trim() } })}
      />
    </View>
  );
}
