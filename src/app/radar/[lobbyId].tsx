import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { RadarScreen } from '@/features/radar/RadarScreen';
import { ensureUserId } from '@/lib/supabase';

export default function RadarRoute() {
  const { lobbyId } = useLocalSearchParams<{ lobbyId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureUserId()
      .then(setUserId)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (userId) return <RadarScreen lobbyId={lobbyId} userId={userId} />;

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      {error ? <Text className="text-center text-rose-600">{error}</Text> : <ActivityIndicator size="large" />}
    </View>
  );
}
