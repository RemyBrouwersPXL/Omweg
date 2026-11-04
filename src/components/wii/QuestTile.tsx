import { ActivityIndicator, Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';

import { GlossBar } from './GlossBar';
import { HandPointer } from './HandPointer';
import { bluePlastic, plastic, text, wii } from './theme';

type Props = {
  title: string;
  description: string;
  kind: string; // e.g. "Side Quest", "Night Mission"
  xp: number;
  gold: number;
  icon: ImageSourcePropType;
  progress: number; // 0..1
  progressLabel: string;
  checkLabel: string; // accessibility label for the big round button
  onCheck: () => void;
  onSkip?: () => void;
  busy?: boolean;
  active?: boolean; // accepted & running: blue glow
  pointer?: boolean;
};

/** Glossy channel-style tile with a 3D object, rewards, progress and a round check button. */
export function QuestTile({
  title,
  description,
  kind,
  xp,
  gold,
  icon,
  progress,
  progressLabel,
  checkLabel,
  onCheck,
  onSkip,
  busy,
  active,
  pointer,
}: Props) {
  return (
    <View
      style={[
        plastic,
        {
          borderRadius: 26,
          padding: 14,
          gap: 10,
          borderWidth: active ? 2.5 : 1,
          borderColor: active ? '#7cc8ff' : '#d2dae3',
          boxShadow: active
            ? '0px 0px 14px rgba(53, 168, 238, 0.55), 0px 6px 14px rgba(40, 60, 90, 0.16), inset 0px 2px 0px #ffffff'
            : plastic.boxShadow,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'linear-gradient(180deg, #f2f5f8 0%, #d9e0e8 100%)',
            borderWidth: 1,
            borderColor: '#cdd6df',
            boxShadow: 'inset 0px 2px 4px rgba(40, 60, 90, 0.15)',
          }}
        >
          <Image source={icon} style={{ width: 60, height: 60 }} accessibilityIgnoresInvertColors />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[text.bold, { fontSize: 17, lineHeight: 21 }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[text.soft, { fontSize: 12 }]}>({kind})</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: wii.blueDeep }}>◆ +{xp} EXP</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#c98a10' }}>● +{gold} Gold</Text>
          </View>
        </View>

        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={checkLabel}
            disabled={busy}
            onPress={onCheck}
            style={({ pressed }) => [
              bluePlastic,
              {
                width: 62,
                height: 62,
                borderRadius: 31,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.9 : 1 }],
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', textShadowColor: 'rgba(0,60,120,0.4)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } }}>
                ✓
              </Text>
            )}
          </Pressable>
          {pointer && <HandPointer />}
        </View>
      </View>

      <Text style={[text.soft, { fontSize: 13, lineHeight: 18, color: '#5d6876' }]}>{description}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <GlossBar value={progress} from="#8fe08a" to="#2fae4e" height={12} />
        </View>
        <Text style={[text.soft, { fontSize: 11, minWidth: 70, textAlign: 'right' }]}>{progressLabel}</Text>
        {onSkip && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Skip ${title}`}
            onPress={onSkip}
            hitSlop={10}
            style={({ pressed }) => [
              plastic,
              { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={{ fontSize: 14, fontWeight: '900', color: wii.inkSoft }}>✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
