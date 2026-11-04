import { View } from 'react-native';

type Props = { value: number; from: string; to: string; height?: number };

/** Rounded "volume" bar: recessed track, gradient fill, white sheen on top. */
export function GlossBar({ value, from, to, height = 14 }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: '#dfe5ec',
        borderWidth: 1,
        borderColor: '#c5ced8',
        boxShadow: 'inset 0px 2px 3px rgba(40, 60, 90, 0.22)',
        overflow: 'hidden',
      }}
    >
      {pct > 0 && (
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: height / 2,
            backgroundImage: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 4,
              right: 4,
              top: 2,
              height: height * 0.35,
              borderRadius: height,
              backgroundColor: 'rgba(255,255,255,0.55)',
            }}
          />
        </View>
      )}
    </View>
  );
}
