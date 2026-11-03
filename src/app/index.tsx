import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestCard, type QuestCardHandle, type SwipeDirection } from '@/components/QuestCard';
import { acceptQuest, generateQuests, type QuestIdea } from '@/lib/quests';

type DeckItem = QuestIdea & { key: string };

const BATCH_SIZE = 5;
const REFILL_AT = 2;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function QuestFeed() {
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const seenTitles = useRef<string[]>([]);
  const topCard = useRef<QuestCardHandle>(null);

  const refill = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setGenerating(true);
    setGenerateError(null);
    try {
      const quests = await generateQuests(BATCH_SIZE, seenTitles.current);
      seenTitles.current.push(...quests.map((q) => q.title));
      const batch = Date.now();
      setDeck((d) => [...d, ...quests.map((q, i) => ({ ...q, key: `${batch}-${i}` }))]);
    } catch (e) {
      setGenerateError(message(e));
    } finally {
      inFlight.current = false;
      setGenerating(false);
    }
  }, []);

  // Keep the deck topped up; stop auto-retrying after a failure until the user taps Retry.
  useEffect(() => {
    if (deck.length < REFILL_AT && !generateError) refill();
  }, [deck.length, generateError, refill]);

  const handleSwiped = (quest: DeckItem, direction: SwipeDirection) => {
    setDeck((d) => d.filter((q) => q.key !== quest.key));
    if (direction === 'left') return;

    setNotice(`Accepted: ${quest.title}`);
    acceptQuest(quest).catch((e) => {
      // Never lose an accepted quest silently: put it back on top so the user can retry.
      setDeck((d) => [quest, ...d]);
      setNotice(`Couldn't save quest: ${message(e)}`);
    });
  };

  const [top, next] = deck;

  return (
    <SafeAreaView className="flex-1 bg-neutral-100">
      <View className="flex-row items-center justify-between px-6 pb-2 pt-4">
        <Text className="text-3xl font-black text-neutral-900">Side Quests</Text>
        <View className="flex-row gap-2">
          <Link href="/manhunt" asChild>
            <Pressable accessibilityRole="button" className="rounded-full bg-emerald-500 px-4 py-2 active:opacity-70">
              <Text className="font-semibold text-white">Manhunt</Text>
            </Pressable>
          </Link>
          <Link href="/quests" asChild>
            <Pressable accessibilityRole="button" className="rounded-full bg-neutral-900 px-4 py-2 active:opacity-70">
              <Text className="font-semibold text-white">My quests</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <Text className="h-6 px-6 text-sm text-neutral-500" numberOfLines={1} accessibilityLiveRegion="polite">
        {notice ?? 'Swipe right to accept, left to skip.'}
      </Text>

      <View className="mx-6 my-4 flex-1">
        {next && (
          <View className="absolute inset-0 scale-95 rounded-3xl bg-white/60" importantForAccessibility="no" />
        )}
        {top ? (
          <QuestCard
            key={top.key}
            ref={topCard}
            quest={top}
            onSwiped={(direction) => handleSwiped(top, direction)}
          />
        ) : (
          <View className="flex-1 items-center justify-center rounded-3xl bg-white p-8">
            {generateError ? (
              <>
                <Text className="text-center text-base text-rose-600">{generateError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={refill}
                  className="mt-4 rounded-full bg-neutral-900 px-6 py-3 active:opacity-70"
                >
                  <Text className="font-semibold text-white">Retry</Text>
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" />
                <Text className="mt-3 text-neutral-500">Summoning quests…</Text>
              </>
            )}
          </View>
        )}
      </View>

      <View className="flex-row justify-center gap-6 pb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip quest"
          disabled={!top}
          onPress={() => topCard.current?.swipe('left')}
          className="h-16 w-32 items-center justify-center rounded-full bg-white shadow active:opacity-70 disabled:opacity-40"
        >
          <Text className="text-lg font-bold text-rose-500">Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accept quest"
          disabled={!top}
          onPress={() => topCard.current?.swipe('right')}
          className="h-16 w-32 items-center justify-center rounded-full bg-emerald-500 shadow active:opacity-70 disabled:opacity-40"
        >
          <Text className="text-lg font-bold text-white">Accept</Text>
        </Pressable>
      </View>

      {generating && top && (
        <ActivityIndicator className="absolute bottom-2 self-center" accessibilityLabel="Loading more quests" />
      )}
    </SafeAreaView>
  );
}
