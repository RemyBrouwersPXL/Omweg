import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingSquares } from '@/components/wii/FloatingSquares';
import { PlayerPanel } from '@/components/wii/PlayerPanel';
import { QuestTile } from '@/components/wii/QuestTile';
import { PLAYER_NAME, playerStats, questProgress } from '@/components/wii/stats';
import { goldFor, icons, plastic, questIcon, text, wii } from '@/components/wii/theme';
import { WiiNavBar } from '@/components/wii/WiiNavBar';
import { completeQuest, listMyQuests, type SavedQuest } from '@/lib/quests';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function TrophyRow({ quest }: { quest: SavedQuest }) {
  return (
    <View style={[plastic, { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 10 }]}>
      <Image source={questIcon(quest.title, quest.description)} style={{ width: 44, height: 44, opacity: 0.85 }} />
      <View style={{ flex: 1 }}>
        <Text style={[text.bold, { fontSize: 15 }]} numberOfLines={1}>
          {quest.title}
        </Text>
        <Text style={[text.soft, { fontSize: 11 }]}>
          Completed {quest.completed_at ? new Date(quest.completed_at).toLocaleDateString() : ''}
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '800', color: wii.blueDeep }}>+{quest.xp} EXP</Text>
      <Image source={icons.coin} style={{ width: 22, height: 22 }} />
    </View>
  );
}

/** Character Inventory: your hero, running quests and completed trophies. */
export default function Inventory() {
  const [quests, setQuests] = useState<SavedQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuests(await listMyQuests());
      setNow(Date.now());
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

  const complete = async (q: SavedQuest) => {
    setCompleting(q.id);
    setError(null);
    try {
      const updated = await completeQuest(q.id);
      setQuests((qs) => qs.map((x) => (x.id === q.id ? updated : x)));
      showToast(`Quest complete! +${q.xp} EXP  +${goldFor(q.xp)} Gold`);
    } catch (e) {
      setError(message(e));
    } finally {
      setCompleting(null);
    }
  };

  const running = quests.filter((q) => q.status === 'accepted');
  const done = quests.filter((q) => q.status === 'completed');
  const stats = playerStats(quests);

  return (
    <View style={{ flex: 1, backgroundColor: wii.bg }}>
      <FloatingSquares />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <PlayerPanel name={PLAYER_NAME} {...stats} />

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          data={done}
          keyExtractor={(q) => q.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {(toast || error) && (
                <View style={[plastic, { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 }]}>
                  <Text accessibilityLiveRegion="polite" style={[text.bold, { fontSize: 13, color: error ? wii.red : wii.blueDeep }]}>
                    {error ?? toast}
                  </Text>
                </View>
              )}
              <Text style={[text.bold, { fontSize: 20 }]}>Active Quests ({running.length})</Text>
              {running.length === 0 && !loading && (
                <Text style={text.soft}>No running quests. Pick one on the Quest Board!</Text>
              )}
              {running.map((q) => {
                const p = questProgress(q, now);
                return (
                  <QuestTile
                    key={q.id}
                    active
                    title={q.title}
                    description={q.description}
                    kind="Active Quest"
                    xp={q.xp}
                    gold={goldFor(q.xp)}
                    icon={questIcon(q.title, q.description)}
                    progress={p.progress}
                    progressLabel={p.label}
                    checkLabel={`Complete ${q.title}`}
                    busy={completing === q.id}
                    onCheck={() => complete(q)}
                  />
                );
              })}
              <Text style={[text.bold, { fontSize: 20, marginTop: 8 }]}>
                Trophies ({done.length}) · {stats.totalXp} EXP
              </Text>
            </View>
          }
          ListEmptyComponent={loading ? undefined : <Text style={text.soft}>No trophies yet. Go finish a quest!</Text>}
          renderItem={({ item }) => <TrophyRow quest={item} />}
        />

        <WiiNavBar current="inventory" onSoon={showToast} />
      </SafeAreaView>
    </View>
  );
}
