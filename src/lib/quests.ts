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
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const REQUEST_TIMEOUT_MS = 15_000;

function timeOfDay(hour: number): string {
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function buildPrompt(now: Date, count: number, avoidTitles: string[]): string {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const avoid = avoidTitles.length ? `\nDo not repeat or closely resemble these: ${avoidTitles.join('; ')}.` : '';

  return `You are the quest master of "Side Quest", a game that turns ordinary days into small real-world adventures.
It is ${weekday}, ${time} (${timeOfDay(now.getHours())}).
Generate ${count} short, actionable OUTDOOR side quests a person can start right now, fitting this time of day.
Rules: safe, legal, free or nearly free, no special equipment, doable alone in 5-60 minutes, playful and specific.
Title: max 6 words, imperative. Description: one sentence, max 25 words, says exactly what to do.
xp: 10-100, scaled by effort. minutes: estimated duration.${avoid}
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
