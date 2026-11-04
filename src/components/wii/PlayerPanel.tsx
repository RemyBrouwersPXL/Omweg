import { Image, Text, View } from 'react-native';

import { GlossBar } from './GlossBar';
import { icons, plastic, text } from './theme';

type Props = {
  name: string;
  level: number;
  exp: number; // 0..1 towards next level
  mana: number; // 0..1
  hp: number; // 0..1
  gold: number;
  coins: number;
};

function Stat({ label, value, from, to }: { label: string; value: number; from: string; to: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={[text.bold, { width: 40, fontSize: 13 }]}>{label}</Text>
      <View style={{ flex: 1 }}>
        <GlossBar value={value} from={from} to={to} />
      </View>
    </View>
  );
}

function Currency({ label, value, icon }: { label: string; value: number; icon: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[text.soft, { fontSize: 11 }]}>{label}</Text>
        <Text style={[text.bold, { fontSize: 15 }]}>{value}</Text>
      </View>
      <Image source={icon} style={{ width: 28, height: 28 }} />
    </View>
  );
}

/** The SIDE QUEST title plate plus the hero card with bars and currencies. */
export function PlayerPanel({ name, level, exp, mana, hp, gold, coins }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <View
        style={[
          plastic,
          {
            alignSelf: 'stretch',
            alignItems: 'center',
            paddingVertical: 12,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 60,
            borderBottomRightRadius: 60,
          },
        ]}
      >
        <Text style={[text.title, { fontSize: 30, letterSpacing: 3 }]} accessibilityRole="header">
          SIDE QUEST
        </Text>
      </View>

      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        accessible
        accessibilityLabel={`${name}, level ${level}, ${gold} gold, ${coins} coins`}
      >
        <View
          style={{
            width: 78,
            height: 78,
            borderRadius: 39,
            padding: 4,
            backgroundImage: 'linear-gradient(135deg, #ff6b9a, #ffc14d, #5fd37a, #35a8ee, #a46bff)',
            boxShadow: '0px 4px 10px rgba(40, 60, 90, 0.25)',
          }}
        >
          <View style={{ flex: 1, borderRadius: 35, backgroundColor: '#f4f8fb', overflow: 'hidden', alignItems: 'center' }}>
            <Image source={icons.avatar} style={{ width: 70, height: 70, marginTop: 4 }} />
          </View>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[text.bold, { fontSize: 19 }]}>{name}</Text>
          <Stat label="EXP" value={exp} from="#ffd36b" to="#f39a1e" />
          <Stat label="Mana" value={mana} from="#8fd4ff" to="#2b8fe2" />
          <Stat label="HP" value={hp} from="#ff9ab8" to="#e5426e" />
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[text.title, { fontSize: 20 }]}>LVL {level}</Text>
          <Currency label="Goud" value={gold} icon={icons.goldbag} />
          <Currency label="Munten" value={coins} icon={icons.coin} />
        </View>
      </View>
    </View>
  );
}
