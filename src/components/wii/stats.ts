import type { SavedQuest } from '@/lib/quests';

import { goldFor, levelFromXp } from './theme';

export const PLAYER_NAME = 'Hero_99';

/** Mana: every running quest drains 20%. Cosmetic for now. */
const MANA_PER_ACTIVE = 0.2;

export function playerStats(quests: SavedQuest[]) {
  const done = quests.filter((q) => q.status === 'completed');
  const active = quests.filter((q) => q.status === 'accepted');
  const totalXp = done.reduce((s, q) => s + q.xp, 0);
  const { level, progress } = levelFromXp(totalXp);
  return {
    level,
    exp: progress,
    totalXp,
    mana: Math.max(0, 1 - active.length * MANA_PER_ACTIVE),
    hp: 0.85,
    gold: done.reduce((s, q) => s + goldFor(q.xp), 0),
    coins: done.length,
  };
}

/** How far a running quest is, based on time since it was accepted. */
export function questProgress(q: SavedQuest, now: number) {
  const elapsedMin = (now - new Date(q.accepted_at).getTime()) / 60_000;
  const progress = Math.max(0.03, Math.min(1, elapsedMin / q.minutes));
  const left = Math.ceil(q.minutes - elapsedMin);
  return { progress, label: left > 0 ? `${left} min left` : 'Ready to claim!' };
}
