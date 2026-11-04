import { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { icons, wii } from './theme';

/** The special game-mode tile: night panel, pulsing neon frame, searchlight icon. */
export function ManhuntTile({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [pulse]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.get() * 0.65 }));

  return (
    <View style={{ padding: 4 }}>
      {/* pulsing outer glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            inset: 0,
            borderRadius: 30,
            borderWidth: 3,
            borderColor: wii.neon,
            boxShadow: `0px 0px 18px ${wii.neon}`,
          },
          glow,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play Manhunt"
        accessibilityHint="Opens the Manhunt lobby to host or join a live game"
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: 26,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          borderWidth: 2,
          borderColor: '#ffffff',
          backgroundImage: 'linear-gradient(160deg, #24365e 0%, #101a33 60%, #0a1022 100%)',
          boxShadow: '0px 8px 18px rgba(10, 16, 34, 0.45), inset 0px 2px 0px rgba(255,255,255,0.25)',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Image source={icons.manhunt} style={{ width: 84, height: 84 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: wii.neon, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>SPECIAL GAME MODE</Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 32,
              fontWeight: '900',
              fontStyle: 'italic',
              letterSpacing: 2,
              textShadowColor: '#ff4d5e',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 0,
            }}
          >
            MANHUNT
          </Text>
          <Text style={{ color: '#b8c6e0', fontSize: 12, fontWeight: '700' }}>Hunt or be hunted · live with friends</Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundImage: 'linear-gradient(180deg, #ff8a8a 0%, #ff4d5e 50%, #e03244 51%, #f24658 100%)',
            borderWidth: 2,
            borderColor: '#fff',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>PLAY ▶</Text>
        </View>
      </Pressable>
    </View>
  );
}
