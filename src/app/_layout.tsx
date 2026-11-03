import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="quests" options={{ title: 'My Quests' }} />
        <Stack.Screen name="radar/[lobbyId]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
