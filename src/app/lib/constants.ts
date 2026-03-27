// ── Shared Constants ─────────────────────────────────────────────────
// Single source of truth for category colors, dynamic labels, and date helpers.
// Eliminates duplication across Dashboard, Goals, CheckIn, Insights, GoalDetail pages.

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string; light: string; dot: string }> = {
  Health:        { bg: 'bg-orange-500',  text: 'text-white',  bar: 'bg-orange-500',  light: 'bg-orange-50',  dot: 'bg-orange-500' },
  Money:         { bg: 'bg-emerald-500', text: 'text-white',  bar: 'bg-emerald-500', light: 'bg-emerald-50', dot: 'bg-emerald-500' },
  Career:        { bg: 'bg-blue-500',    text: 'text-white',  bar: 'bg-blue-500',    light: 'bg-blue-50',    dot: 'bg-blue-500' },
  Mind:          { bg: 'bg-purple-500',  text: 'text-white',  bar: 'bg-purple-500',  light: 'bg-purple-50',  dot: 'bg-purple-500' },
  Weight:        { bg: 'bg-rose-500',    text: 'text-white',  bar: 'bg-rose-500',    light: 'bg-rose-50',    dot: 'bg-rose-500' },
  Relationships: { bg: 'bg-pink-500',    text: 'text-white',  bar: 'bg-pink-500',    light: 'bg-pink-50',    dot: 'bg-pink-500' },
  Discipline:    { bg: 'bg-slate-600',   text: 'text-white',  bar: 'bg-slate-600',   light: 'bg-slate-50',   dot: 'bg-slate-600' },
  Productivity:  { bg: 'bg-cyan-600',    text: 'text-white',  bar: 'bg-cyan-600',    light: 'bg-cyan-50',    dot: 'bg-cyan-600' },
  Home:          { bg: 'bg-amber-500',   text: 'text-white',  bar: 'bg-amber-500',   light: 'bg-amber-50',   dot: 'bg-amber-500' },
  Dynamic:       { bg: 'bg-stride-600',  text: 'text-white',  bar: 'bg-stride-600',  light: 'bg-stride-50',  dot: 'bg-stride-600' },
};

export const getCategoryColors = (cat: string) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.Dynamic;

// ── Dynamic Action Label ────────────────────────────────────────────
// Generates a 3-5 word button label for logging a goal's daily action.
export function getDynamicActionLabel(goal: { plan?: { todayActionLabel?: string; todayAction?: string }; title?: string; category?: string }): string {
  if (goal.plan?.todayActionLabel) {
    const words = goal.plan.todayActionLabel.trim().split(/\s+/);
    return words.length <= 5 ? goal.plan.todayActionLabel : words.slice(0, 5).join(' ');
  }
  if (goal.plan?.todayAction) {
    const words = goal.plan.todayAction.trim().split(/\s+/);
    if (words.length <= 4) return `Log ${goal.plan.todayAction}`;
    const a = goal.plan.todayAction.toLowerCase();
    if (a.includes('run')) return 'Log run session';
    if (a.includes('read')) return 'Log reading session';
    if (a.includes('meditat')) return 'Log meditation';
    if (a.includes('gym') || a.includes('workout')) return 'Log gym session';
    if (a.includes('walk')) return 'Log walk';
    if (a.includes('save') || a.includes('transfer')) return 'Log savings deposit';
    if (a.includes('code') || a.includes('learn')) return 'Log learning session';
    if (a.includes('write') || a.includes('journal')) return 'Log writing session';
    if (a.includes('stretch') || a.includes('yoga')) return 'Log stretch session';
    if (a.includes('meal') || a.includes('cook')) return 'Log healthy meal';
    if (a.includes('sleep')) return 'Log sleep';
    return "Log today's action";
  }
  const title = (goal.title || '').toLowerCase();
  if (title.includes('run') || title.includes('marathon') || title.includes('jog')) return 'Log run session';
  if (title.includes('read') || title.includes('book')) return 'Log reading session';
  if (title.includes('meditat')) return 'Log meditation';
  if (title.includes('gym') || title.includes('workout') || title.includes('exercise') || title.includes('fit')) return 'Log workout';
  if (title.includes('save') || title.includes('money')) return 'Log savings deposit';
  if (title.includes('diet') || title.includes('eat') || title.includes('meal') || title.includes('fruit') || title.includes('vegetable')) return 'Log healthy meal';
  if (title.includes('water')) return 'Log water intake';
  if (title.includes('sleep')) return 'Log sleep';
  return "Log today's action";
}

// ── Logged Today Check ──────────────────────────────────────────────
export function isLoggedToday(goal: { logs?: { date: string }[] }): boolean {
  if (!goal.logs || goal.logs.length === 0) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return goal.logs.some(log => {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });
}

// ── Haptic Feedback ─────────────────────────────────────────────────
// Triggers device vibration on supported mobile browsers for tactile feedback.
export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    if (!navigator?.vibrate) return;
    const patterns: Record<string, number> = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(patterns[style] ?? 10);
  } catch {
    // Silently fail — haptics are a progressive enhancement
  }
}

// ── Chat History Truncation ─────────────────────────────────────────
// Caps the message history sent to the API to prevent token overflow.
const MAX_API_HISTORY = 40;
export function truncateHistoryForAPI(
  messages: { role: string; content: string | unknown }[]
): { role: string; content: string }[] {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && (m.content as string).trim() !== '')
    .slice(-MAX_API_HISTORY)
    .map((m) => ({ role: m.role, content: m.content as string }));
}

// ── Unique ID Generator ─────────────────────────────────────────────
export function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}