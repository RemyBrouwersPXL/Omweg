import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Fixed layout so the backdrop looks the same on every render.
const SQUARES = [
  { left: '6%', top: '4%', size: 26, delay: 0 },
  { left: '78%', top: '7%', size: 18, delay: 600 },
  { left: '88%', top: '22%', size: 30, delay: 1200 },
  { left: '3%', top: '30%', size: 16, delay: 300 },
  { left: '70%', top: '38%', size: 22, delay: 1800 },
  { left: '12%', top: '52%', size: 28, delay: 900 },
  { left: '90%', top: '58%', size: 14, delay: 2400 },
  { left: '40%', top: '66%', size: 20, delay: 1500 },
  { left: '5%', top: '76%', size: 18, delay: 2100 },
  { left: '80%', top: '82%', size: 26, delay: 450 },
  { left: '52%', top: '12%', size: 12, delay: 2700 },
  { left: '30%', top: '90%', size: 16, delay: 1100 },
] as const;

function Square({ left, top, size, delay }: (typeof SQUARES)[number]) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + t.get() * 0.35,
    transform: [{ translateY: -14 * t.get() }, { rotate: `${t.get() * 12}deg` }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left, top, width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#c9d1da' },
        style,
      ]}
    />
  );
}

/** The drifting pale squares behind the menu. Purely decorative. */
export function FloatingSquares() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      {SQUARES.map((s, i) => (
        <Square key={i} {...s} />
      ))}
    </View>
  );
}
