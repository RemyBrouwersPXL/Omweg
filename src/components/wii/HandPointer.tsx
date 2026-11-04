import { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { icons } from './theme';

/** Floating blue hand that keeps "tapping" the button it sits on. Decorative only. */
export function HandPointer({ right = -6, bottom = -26 }: { right?: number; bottom?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.85, { duration: 120 }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: 10 - t.get() * 10 }, { translateY: 12 - t.get() * 12 }, { rotate: '-18deg' }, { scale: 1 - (t.get() > 0.9 ? 0.06 : 0) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right, bottom, zIndex: 10 }, style]}>
      <Image source={icons.hand} style={{ width: 46, height: 46 }} accessibilityElementsHidden importantForAccessibility="no" />
    </Animated.View>
  );
}
