import { useImperativeHandle, type Ref } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { QuestIdea } from '@/lib/quests';

export type SwipeDirection = 'left' | 'right';
export type QuestCardHandle = { swipe: (direction: SwipeDirection) => void };

type Props = {
  quest: QuestIdea;
  onSwiped: (direction: SwipeDirection) => void;
  ref?: Ref<QuestCardHandle>;
};

const FLING_VELOCITY = 800;

/** Tinder-style card: drag right to accept, left to skip. */
export function QuestCard({ quest, onSwiped, ref }: Props) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const threshold = width * 0.3;

  const flyOut = (direction: SwipeDirection) => {
    'worklet';
    x.set(withTiming((direction === 'right' ? 1 : -1) * width * 1.5, { duration: 220 }, (finished) => {
      if (finished) scheduleOnRN(onSwiped, direction);
    }));
  };

  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  const pan = usePanGesture({
    activeOffsetX: [-10, 10],
    onUpdate: (e) => {
      'worklet';
      x.set(e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      const flung = Math.abs(e.velocityX) > FLING_VELOCITY;
      if (!e.canceled && (Math.abs(e.translationX) > threshold || flung)) {
        flyOut((flung ? e.velocityX : e.translationX) > 0 ? 'right' : 'left');
      } else {
        x.set(withSpring(0));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { rotate: `${interpolate(x.get(), [-width, 0, width], [-12, 0, 12])}deg` },
    ],
  }));
  const acceptStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, threshold], [0, 1], 'clamp') }));
  const skipStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [-threshold, 0], [1, 0], 'clamp') }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', inset: 0 }, cardStyle]}>
        <View
          className="flex-1 justify-between rounded-3xl bg-white p-7 shadow-lg"
          accessible
          accessibilityLabel={`${quest.title}. ${quest.description}. ${quest.xp} XP, about ${quest.minutes} minutes`}
          accessibilityHint="Swipe right to accept, left to skip"
        >
          <View className="flex-row justify-between">
            <Text className="text-xs font-bold uppercase tracking-widest text-emerald-600">Side Quest</Text>
            <Text className="text-xs font-semibold text-neutral-400">~{quest.minutes} min</Text>
          </View>

          <View>
            <Text className="text-3xl font-extrabold leading-tight text-neutral-900">{quest.title}</Text>
            <Text className="mt-4 text-lg leading-relaxed text-neutral-600">{quest.description}</Text>
          </View>

          <Text className="self-start rounded-full bg-amber-100 px-4 py-1.5 text-base font-bold text-amber-700">
            +{quest.xp} XP
          </Text>

          <Animated.View style={[{ position: 'absolute', top: 28, right: 28 }, acceptStyle]}>
            <Text className="rounded-lg border-4 border-emerald-500 px-3 py-1 text-2xl font-black text-emerald-500">
              ACCEPT
            </Text>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: 28, left: 28 }, skipStyle]}>
            <Text className="rounded-lg border-4 border-rose-500 px-3 py-1 text-2xl font-black text-rose-500">SKIP</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
