import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { RadarScreen } from './src/features/radar/RadarScreen';

// Temporary entry until the lobby flow provides the lobby and signed-in user.
const lobbyId = process.env.EXPO_PUBLIC_DEV_LOBBY_ID;
const userId = process.env.EXPO_PUBLIC_DEV_USER_ID;

export default function App() {
  return (
    <>
      {lobbyId && userId ? (
        <RadarScreen lobbyId={lobbyId} userId={userId} />
      ) : (
        <View style={styles.container}>
          <Text>Set EXPO_PUBLIC_DEV_LOBBY_ID and EXPO_PUBLIC_DEV_USER_ID to open the radar.</Text>
        </View>
      )}
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 16 },
});
