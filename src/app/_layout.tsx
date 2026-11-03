import '../../global.css';
// Defines the background GPS task; TaskManager tasks must be registered at module top level.
import '@/features/gps/locationBroadcast';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Button } from '@/components/ui';
import { useAnonymousSession } from '@/lib/useAnonymousSession';

// Dark chrome for the Manhunt lobby flow (manhunt.tsx switches the status bar to light).
const lobbyScreenOptions = {
  headerStyle: { backgroundColor: '#09090b' },
  headerTintColor: '#fff',
  contentStyle: { backgroundColor: '#09090b' },
};

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="quests" options={{ title: 'My Quests' }} />
        <Stack.Screen name="radar/[lobbyId]" options={{ headerShown: false }} />
        <Stack.Screen name="manhunt" options={{ ...lobbyScreenOptions, title: 'Manhunt' }} />
        <Stack.Screen name="join" options={{ ...lobbyScreenOptions, title: 'Join lobby' }} />
        <Stack.Screen name="lobby/[id]" options={{ ...lobbyScreenOptions, title: 'Lobby' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
