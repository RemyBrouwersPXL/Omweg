import { router } from 'expo-router';
import { Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons, plastic, wii } from './theme';

export type NavKey = 'tavern' | 'board' | 'inventory' | 'social' | 'shop';

type Item = { key: NavKey; label: string; icon: ImageSourcePropType; badge?: boolean };

const ITEMS: Item[] = [
  { key: 'tavern', label: 'Tavern/\nGuild', icon: icons.sword, badge: true },
  { key: 'board', label: 'Quest\nBoard', icon: icons.questboard, badge: true },
  { key: 'inventory', label: 'Character\nInventory', icon: icons.hero },
  { key: 'social', label: 'Guild/\nSocial', icon: icons.handshake, badge: true },
  { key: 'shop', label: 'Shop', icon: icons.shopbag, badge: true },
];

function Badge() {
  return (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(180deg, #ff7a70 0%, #e8413a 100%)',
        borderWidth: 2,
        borderColor: '#fff',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>!</Text>
    </View>
  );
}

type Props = { current: NavKey; onSoon?: (label: string) => void };

/** Silver console-style bar with round, physical-looking buttons. */
export function WiiNavBar({ current, onSoon }: Props) {
  const insets = useSafeAreaInsets();

  const go = (key: NavKey) => {
    if (key === current) return;
    switch (key) {
      case 'board':
        router.dismissTo('/');
        return;
      case 'inventory':
        router.push('/quests');
        return;
      case 'tavern':
        router.push('/manhunt');
        return;
      case 'social':
        router.push('/join');
        return;
      case 'shop':
        onSoon?.('The Shop opens soon!');
        return;
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: 6,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundImage: 'linear-gradient(180deg, #fbfcfd 0%, #e2e7ec 45%, #cfd6de 100%)',
        borderTopWidth: 1,
        borderColor: '#c2cbd5',
        boxShadow: '0px -4px 14px rgba(40, 60, 90, 0.14), inset 0px 2px 0px #ffffff',
      }}
    >
      {ITEMS.map((item) => {
        const big = item.key === 'inventory';
        const size = big ? 74 : 54;
        const selected = item.key === current;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label.replace('\n', ' ')}
            accessibilityState={{ selected }}
            onPress={() => go(item.key)}
            style={({ pressed }) => ({ alignItems: 'center', width: big ? 84 : 62, transform: [{ scale: pressed ? 0.9 : 1 }] })}
          >
            <View
              style={[
                plastic,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: big ? -22 : 0,
                },
                big && {
                  borderWidth: 3,
                  borderColor: '#9fd8ff',
                  backgroundImage: 'radial-gradient(circle at 50% 35%, #ffffff 0%, #dff2ff 55%, #a9dcff 100%)',
                  boxShadow: '0px 0px 18px rgba(53, 168, 238, 0.75), 0px 6px 12px rgba(40, 60, 90, 0.2)',
                },
                selected && !big && { borderColor: wii.blue, borderWidth: 2.5 },
              ]}
            >
              <Image source={item.icon} style={{ width: size * 0.62, height: size * 0.62 }} />
              {item.badge && <Badge />}
            </View>
            <Text
              numberOfLines={2}
              style={{
                marginTop: 4,
                fontSize: big ? 11 : 10,
                lineHeight: big ? 13 : 12,
                fontWeight: '800',
                textAlign: 'center',
                color: selected || big ? wii.blueDeep : wii.ink,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
