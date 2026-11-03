import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useAnonymousSession } from '@/lib/useAnonymousSession';

export default function RootLayout() {
  const { session, error, retry } = useAnonymousSession();

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-zinc-950 px-6">
        <StatusBar style="light" />
        {error ? (
          <>
            <Text className="text-center text-red-400">Could not sign in: {error}</Text>
            <Button label="Retry" onPress={retry} />
          </>
        ) : (
          <ActivityIndicator color="#10b981" size="large" />
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#09090b' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#09090b' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Manhunt' }} />
        <Stack.Screen name="join" options={{ title: 'Join lobby' }} />
        <Stack.Screen name="lobby/[id]" options={{ title: 'Lobby' }} />
      </Stack>
    </>
  );
}
