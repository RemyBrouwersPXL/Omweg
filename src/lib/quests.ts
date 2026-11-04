import { ensureUserId, supabase } from './supabase';

export type QuestIdea = {
  title: string;
  description: string;
  xp: number;
  minutes: number;
};

export type QuestStatus = 'accepted' | 'completed';

export type SavedQuest = QuestIdea & {
  id: string;
  status: QuestStatus;
  accepted_at: string;
  completed_at: string | null;
};

// ---------- LLM generation (Groq, OpenAI-compatible chat completions) ----------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 15_000;

function timeOfDay(hour: number): string {
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

// A few themes are drawn at random per batch so the feed doesn't converge on
// the same "take a walk / look at a tree" ideas.
const QUEST_THEMES = [
  'sprint or speed challenge (beat a time, race a bus, outrun a traffic light)',
  'parkour-lite movement (balance on curbs, vault low walls, stair climbs) - safe, no climbing on buildings',
  'urban exploration (find the highest/oldest/strangest spot reachable on foot)',
  'scavenger hunt (find and photograph 5 specific things in limited time)',
  'navigation challenge (walk/run to a point using only the sun, a compass or street names)',
  'endurance or strength mini-workout using street furniture (benches, stairs, railings)',
  'stealth or spy mission (tail a landmark route unseen, reach a spot without being noticed)',
  'creative photo or video stunt (recreate a movie scene, forced perspective shot)',
  'social dare that is kind and harmless (get a stranger to recommend a hidden spot)',
  'random route (flip a coin at every crossing for 15 minutes, then find your way back)',
  'geo-art (run or walk a route that draws a shape or letter on a GPS map)',
  'speed collecting (touch 10 different lampposts / trees / benches as fast as possible)',
];

function pickThemes(n: number): string[] {
  const pool = [...QUEST_THEMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

function buildPrompt(now: Date, count: number, avoidTitles: string[]): string {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const tod = timeOfDay(now.getHours());
  const themes = pickThemes(Math.min(count, 4)).map((t) => `- ${t}`).join('\n');
  const avoid = avoidTitles.length ? `\nNever repeat or closely resemble these: ${avoidTitles.join('; ')}.` : '';

  return `You are the quest master of "Side Quest", a game that turns ordinary days into real-world ADVENTURES.
It is ${weekday}, ${time} (${tod}).
Generate ${count} OUTDOOR side quests a person can start right now. They must get the player MOVING: running, sprinting, climbing stairs, exploring, racing the clock.

Draw inspiration from these themes (spread the quests across them):
${themes}

Every quest MUST have:
- a physical action (move, run, climb stairs, explore, hunt for something),
- a concrete, measurable goal (a number, a time limit, a distance, a specific thing to find or photograph),
- a twist that makes it feel like a game (a rule, a dare, a constraint, a mission framing).

BAD (too boring, never do this): "Take a walk in the park", "Look at the sky", "Notice 3 trees", "Breathe fresh air", "Smile at someone".
GOOD: "Sprint to the third lamppost, walk back, repeat 8 times in under 6 minutes", "Find 5 different doors painted red within 20 minutes and photograph each one", "Take only left turns for 10 minutes, then navigate home without your map".

Rules: safe, legal, free, no special equipment, doable alone in 5-60 minutes, fits the ${tod} (at night: well-lit, populated areas only). No trespassing, no traffic risks, no bothering strangers.
Title: max 6 words, punchy, imperative. Description: one or two sentences, max 35 words, says exactly what to do and when it counts as done.
xp: 10-100, scaled by physical effort and difficulty. minutes: estimated duration.${avoid}
Respond with JSON only: {"quests":[{"title":string,"description":string,"xp":number,"minutes":number}]}`;
}

/** The model's output crosses a trust boundary: keep only well-formed quests. */
function parseQuests(raw: unknown): QuestIdea[] {
  const list = (raw as { quests?: unknown })?.quests;
  if (!Array.isArray(list)) return [];

  return list.flatMap((q): QuestIdea[] => {
    if (typeof q?.title !== 'string' || typeof q?.description !== 'string') return [];
    const title = q.title.trim().slice(0, 80);
    const description = q.description.trim().slice(0, 300);
    if (!title || !description) return [];
    const clamp = (n: unknown, min: number, max: number, fallback: number) =>
      typeof n === 'number' && Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : fallback;
    return [{ title, description, xp: clamp(q.xp, 10, 100, 25), minutes: clamp(q.minutes, 5, 120, 15) }];
  });
}

export async function generateQuests(count = 5, avoidTitles: string[] = []): Promise<QuestIdea[]> {
  const apiKey = process.env.EXPO_PUBLIC_LLM_API_KEY;
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_LLM_API_KEY (Groq API key) in .env');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: buildPrompt(new Date(), count, avoidTitles.slice(-20)) }],
      }),
    });
    if (!res.ok) throw new Error(`Quest generator failed (${res.status})`);

    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    const quests = parseQuests(typeof content === 'string' ? JSON.parse(content) : null);
    if (!quests.length) throw new Error('Quest generator returned no usable quests');
    return quests;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Quest generator timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Persistence (Supabase `quests` table) ----------

const COLUMNS = 'id,title,description,xp,minutes,status,accepted_at,completed_at';

export async function acceptQuest({ title, description, xp, minutes }: QuestIdea): Promise<SavedQuest> {
  const user_id = await ensureUserId();
  const { data, error } = await supabase
    .from('quests')
    .insert({ title, description, xp, minutes, user_id, status: 'accepted' })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as SavedQuest;
}

export async function completeQuest(id: string): Promise<SavedQuest> {
  await ensureUserId();
  const { data, error } = await supabase
    .from('quests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'accepted')
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as SavedQuest;
}

export async function listMyQuests(): Promise<SavedQuest[]> {
  await ensureUserId();
  const { data, error } = await supabase
    .from('quests')
    .select(COLUMNS)
    .order('accepted_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data as SavedQuest[];
}
