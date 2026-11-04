import type { ImageSourcePropType, TextStyle, ViewStyle } from 'react-native';

/** Soft "console menu" palette: light greys, glossy whites, one friendly blue. */
export const wii = {
  bg: '#e8ecf0',
  ink: '#3d4652',
  inkSoft: '#7d8896',
  blue: '#35a8ee',
  blueDeep: '#1b7fd8',
  border: '#d3dbe4',
  red: '#e8413a',
  night: '#0e1830',
  neon: '#39f0c8',
} as const;

export const text = {
  title: { fontWeight: '900', color: wii.ink, letterSpacing: 1 },
  bold: { fontWeight: '800', color: wii.ink },
  soft: { fontWeight: '600', color: wii.inkSoft },
} satisfies Record<string, TextStyle>;

/** Glossy white plastic: vertical sheen + soft drop shadow + inner top highlight. */
export const plastic: ViewStyle = {
  backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f4f6f9 55%, #e4e9ef 100%)',
  borderWidth: 1,
  borderColor: '#d2dae3',
  boxShadow: '0px 6px 14px rgba(40, 60, 90, 0.16), inset 0px 2px 0px rgba(255, 255, 255, 0.95)',
};

/** Shiny blue button plastic. */
export const bluePlastic: ViewStyle = {
  backgroundImage: 'linear-gradient(180deg, #8fd4ff 0%, #3aa9f0 48%, #1b7fd8 52%, #2b93e6 100%)',
  borderWidth: 3,
  borderColor: '#ffffff',
  boxShadow: '0px 5px 12px rgba(27, 127, 216, 0.45), 0px 0px 0px 1px #9fcbea',
};

export const icons = {
  avatar: require('../../../assets/wii/avatar.png'),
  hand: require('../../../assets/wii/hand.png'),
  sword: require('../../../assets/wii/sword.png'),
  questboard: require('../../../assets/wii/questboard.png'),
  hero: require('../../../assets/wii/hero.png'),
  handshake: require('../../../assets/wii/handshake.png'),
  shopbag: require('../../../assets/wii/shopbag.png'),
  goldbag: require('../../../assets/wii/goldbag.png'),
  coin: require('../../../assets/wii/coin.png'),
  manhunt: require('../../../assets/wii/manhunt.png'),
  sneaker: require('../../../assets/wii/sneaker.png'),
  flashlight: require('../../../assets/wii/flashlight.png'),
  map: require('../../../assets/wii/map.png'),
  camera: require('../../../assets/wii/camera.png'),
  stopwatch: require('../../../assets/wii/stopwatch.png'),
  target: require('../../../assets/wii/target.png'),
  compass: require('../../../assets/wii/compass.png'),
  dice: require('../../../assets/wii/dice.png'),
} satisfies Record<string, ImageSourcePropType>;

const QUEST_ICON_RULES: [RegExp, keyof typeof icons][] = [
  [/photo|picture|film|video|selfie|shot|scene/i, 'camera'],
  [/coin|flip|random|dice|chance|luck/i, 'dice'],
  [/dark|night|stealth|spy|shadow|unseen|sneak|lit\b|light/i, 'flashlight'],
  [/compass|north|south|sun|direction|navigat/i, 'compass'],
  [/map|route|explore|turn|street|draw|shape|gps/i, 'map'],
  [/sprint|run|race|jog|dash|stairs|lap/i, 'sneaker'],
  [/find|hunt|scaveng|search|collect|touch|spot/i, 'target'],
  [/time|minute|second|clock|timer|beat|fast/i, 'stopwatch'],
];
const FALLBACK: (keyof typeof icons)[] = ['sneaker', 'target', 'map', 'stopwatch', 'compass', 'camera'];

/** Pick a matching 3D object for a quest from its wording. */
export function questIcon(title: string, description: string): ImageSourcePropType {
  const hay = `${title} ${description}`;
  const hit = QUEST_ICON_RULES.find(([re]) => re.test(hay));
  if (hit) return icons[hit[1]];
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return icons[FALLBACK[Math.abs(h) % FALLBACK.length]];
}

/** Gold reward shown on a quest card (derived from XP so it stays consistent). */
export const goldFor = (xp: number) => Math.max(1, Math.round(xp / 4));

/** Level curve: every 150 XP is one level. */
export const XP_PER_LEVEL = 150;
export function levelFromXp(totalXp: number) {
  return { level: Math.floor(totalXp / XP_PER_LEVEL) + 1, progress: (totalXp % XP_PER_LEVEL) / XP_PER_LEVEL };
}
