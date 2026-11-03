import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { completeQuest, listMyQuests, type SavedQuest } from '@/lib/quests';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function MyQuests() {
  const [quests, setQuests] = useState<SavedQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuests(await listMyQuests());
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const complete = async (id: string) => {
    setCompleting(id);
    setError(null);
    try {
      const updated = await completeQuest(id);
      setQuests((qs) => qs.map((q) => (q.id === id ? updated : q)));
    } catch (e) {
      setError(message(e));
    } finally {
      setCompleting(null);
    }
  };

  const earned = quests.reduce((sum, q) => (q.status === 'completed' ? sum + q.xp : sum), 0);

  return (
    <FlatList
      className="flex-1 bg-neutral-100"
      contentContainerClassName="gap-3 p-4"
      data={quests}
      keyExtractor={(q) => q.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View className="mb-2">
          <Text className="text-lg font-bold text-amber-700">{earned} XP earned</Text>
          {error && <Text className="mt-1 text-rose-600">{error}</Text>}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : <Text className="mt-8 text-center text-neutral-500">No quests yet — go accept one!</Text>
      }
      renderItem={({ item }) => {
        const done = item.status === 'completed';
        return (
          <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
            <View className="flex-1">
              <Text className={`text-base font-bold ${done ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                {item.title}
              </Text>
              <Text className="mt-1 text-sm text-neutral-500">{item.description}</Text>
            </View>
            {done ? (
              <Text className="font-bold text-emerald-600">+{item.xp} XP</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark ${item.title} as completed`}
                disabled={completing === item.id}
                onPress={() => complete(item.id)}
                className="rounded-full bg-emerald-500 px-4 py-2 active:opacity-70 disabled:opacity-40"
              >
                <Text className="font-semibold text-white">Done</Text>
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}
