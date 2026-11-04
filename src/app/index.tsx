import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingSquares } from '@/components/wii/FloatingSquares';
import { ManhuntTile } from '@/components/wii/ManhuntTile';
import { PlayerPanel } from '@/components/wii/PlayerPanel';
import { QuestTile } from '@/components/wii/QuestTile';
import { PLAYER_NAME, playerStats, questProgress } from '@/components/wii/stats';
import { bluePlastic, goldFor, plastic, questIcon, text, wii } from '@/components/wii/theme';
import { WiiNavBar } from '@/components/wii/WiiNavBar';
import {
  acceptQuest,
  completeQuest,
  generateQuests,
  listMyQuests,
  type QuestIdea,
  type SavedQuest,
} from '@/lib/quests';

type Offer = QuestIdea & { key: string };

const BATCH_SIZE = 4;
const REFILL_AT = 2;
const MANHUNT_AFTER = 2; // the Manhunt tile sits after this many quest tiles

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const offerKind = () => (new Date().getHours() >= 19 || new Date().getHours() < 6 ? 'Night Mission' : 'Side Quest');

export default function QuestBoard() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [mine, setMine] = useState<SavedQuest[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const seenTitles = useRef<string[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Progress bars of running quests follow the clock.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      setMine(await listMyQuests());
    } catch (e) {
      showToast(`Couldn't load your quests: ${message(e)}`);
    } finally {
      setLoadingMine(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadMine();
    }, [loadMine]),
  );

  const refill = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setGenerating(true);
    setGenerateError(null);
    try {
      const quests = await generateQuests(BATCH_SIZE, seenTitles.current);
      seenTitles.current.push(...quests.map((q) => q.title));
      const batch = Date.now();
      setOffers((o) => [...o, ...quests.map((q, i) => ({ ...q, key: `${batch}-${i}` }))]);
    } catch (e) {
      setGenerateError(message(e));
    } finally {
      inFlight.current = false;
      setGenerating(false);
    }
  }, []);

  // Keep the board topped up; after a failure wait for the user to tap Retry.
  useEffect(() => {
    if (offers.length < REFILL_AT && !generateError) refill();
  }, [offers.length, generateError, refill]);

  const accept = async (offer: Offer) => {
    setBusy(offer.key);
    try {
      const saved = await acceptQuest(offer);
      setOffers((o) => o.filter((q) => q.key !== offer.key));
      setMine((m) => [saved, ...m]);
      showToast(`Quest accepted: ${offer.title}`);
    } catch (e) {
      showToast(`Couldn't save quest: ${message(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const complete = async (quest: SavedQuest) => {
    setBusy(quest.id);
    try {
      const updated = await completeQuest(quest.id);
      setMine((m) => m.map((q) => (q.id === quest.id ? updated : q)));
      showToast(`Quest complete! +${quest.xp} EXP  +${goldFor(quest.xp)} Gold`);
    } catch (e) {
      showToast(`Couldn't complete quest: ${message(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const skip = (offer: Offer) => setOffers((o) => o.filter((q) => q.key !== offer.key));

  const stats = playerStats(mine);
  const running = mine.filter((q) => q.status === 'accepted');
  const kind = offerKind();

  // One list: running quests first, then fresh offers. The Manhunt tile is slotted in between.
  const tiles = [
    ...running.map((q) => {
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
          busy={busy === q.id}
          onCheck={() => complete(q)}
        />
      );
    }),
    ...offers.map((o) => (
      <QuestTile
        key={o.key}
        title={o.title}
        description={o.description}
        kind={kind}
        xp={o.xp}
        gold={goldFor(o.xp)}
        icon={questIcon(o.title, o.description)}
        progress={0}
        progressLabel={`~${o.minutes} min`}
        checkLabel={`Accept ${o.title}`}
        busy={busy === o.key}
        onCheck={() => accept(o)}
        onSkip={() => skip(o)}
      />
    )),
  ];
  // The pointer hovers over the first tile's button to invite the first tap.
  const items = tiles.map((t, i) => (i === 0 ? cloneElement(t, { pointer: true }) : t));
  items.splice(Math.min(MANHUNT_AFTER, items.length), 0, <ManhuntTile key="manhunt" onPress={() => router.push('/manhunt')} />);

  return (
    <View style={{ flex: 1, backgroundColor: wii.bg }}>
      <StatusBar style="dark" />
      <FloatingSquares />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <PlayerPanel name={PLAYER_NAME} {...stats} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10 }}>
          <Text style={[text.bold, { fontSize: 20 }]}>Quest Cards</Text>
          {generating && <ActivityIndicator color={wii.blue} accessibilityLabel="Loading more quests" />}
        </View>

        {toast && (
          <Animated.View
            entering={FadeInDown}
            exiting={FadeOutUp}
            style={[plastic, { marginHorizontal: 20, marginTop: 6, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 }]}
          >
            <Text accessibilityLiveRegion="polite" style={[text.bold, { fontSize: 13, color: wii.blueDeep }]} numberOfLines={2}>
              {toast}
            </Text>
          </Animated.View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
          refreshControl={<RefreshControl refreshing={loadingMine && mine.length > 0} onRefresh={loadMine} />}
        >
          {items.map((item, i) => (
            <Animated.View key={item.key} entering={FadeInDown.delay(Math.min(i, 4) * 60)} layout={LinearTransition}>
              {item}
            </Animated.View>
          ))}

          {offers.length === 0 && (
            <View style={[plastic, { borderRadius: 26, padding: 20, alignItems: 'center', gap: 12 }]}>
              {generateError ? (
                <>
                  <Text style={[text.bold, { color: wii.red, textAlign: 'center' }]}>{generateError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={refill}
                    style={({ pressed }) => [bluePlastic, { borderRadius: 22, paddingHorizontal: 24, paddingVertical: 10, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Retry</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <ActivityIndicator color={wii.blue} size="large" />
                  <Text style={text.soft}>Summoning new quests…</Text>
                </>
              )}
            </View>
          )}
        </ScrollView>

        <WiiNavBar current="board" onSoon={showToast} />
      </SafeAreaView>
    </View>
  );
}
