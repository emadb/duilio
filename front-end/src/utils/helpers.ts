import { TAG_COLORS } from '../constants';
import type { ReviewAction, TagColor, Task } from '../types/task';

/** Generate a short unique id */
export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Format a YYYY-MM-DD date string into a human-readable label */
export function fmtDate(dateStr: string): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Returns true when a task's due date is in the past and it isn't done */
export function isOverdue(dueDate: string, status: string): boolean {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate + 'T00:00:00') < new Date(new Date().toDateString());
}

/**
 * Deterministically pick a color index from TAG_COLORS for a given tag slug.
 * Stable across sessions — same tag always gets the same fallback color.
 */
export function autoColorIndex(tag: string): number {
  let h = 5381;
  for (let i = 0; i < tag.length; i++) {
    h = ((h << 5) + h) + tag.charCodeAt(i);
  }
  return Math.abs(h) % TAG_COLORS.length;
}

/** Resolve a tag's color object, preferring the user-assigned map entry */
export function resolveTagColor(
  tag: string,
  tagColorMap: Record<string, number>,
): TagColor {
  const idx = tagColorMap[tag] ?? autoColorIndex(tag);
  return TAG_COLORS[idx];
}

/** Normalize a raw tag input string into a slug */
export function slugifyTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Tags to offer in the tag input: tags the user already has come first, then the
 * presets that are not in use yet. Tags already on the card and tags that do not
 * contain the typed text are left out.
 */
export function tagSuggestions(
  known: string[],
  presets: string[],
  selected: string[],
  query: string,
  limit = 30,
): string[] {
  const q = query.trim().toLowerCase();
  const own = [...known].sort((a, b) => a.localeCompare(b));
  const all = [...own, ...presets.filter((p) => !known.includes(p))];

  return all.filter((t) => !selected.includes(t) && t.includes(q)).slice(0, limit);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between an ISO timestamp and `now`, never negative */
export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

/** ISO 8601 week number of a YYYY-MM-DD date */
export function isoWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

/** Small badges that make stale work visible, in display order */
export function cardBadges(task: Task, now: Date): string[] {
  const badges: string[] = [];

  if (task.status === 'in-progress') {
    badges.push(`${daysSince(task.statusChangedAt, now)}d`);
  }
  if (task.status === 'blocked') {
    const since = daysSince(task.waitingSince || task.statusChangedAt, now);
    badges.push(`${task.waitingOn || 'someone'} · ${since}d`);
  }
  if (task.status === 'paused' && task.pausedUntil) {
    badges.push(`Back wk ${isoWeekNumber(task.pausedUntil)}`);
  }
  if (task.status === 'done' && task.completedAt) {
    const day = new Date(task.completedAt).toLocaleDateString('en-US', { weekday: 'short' });
    badges.push(`Done ${day}`);
  }
  if (task.rolloverCount > 0) {
    badges.push(`↻${task.rolloverCount}`);
  }

  return badges;
}

/** The board shows a done card only when it was completed since the week started */
export function onBoard(task: Task, weekStartsAt: string): boolean {
  if (task.status !== 'done' || !task.completedAt) return true;
  return new Date(task.completedAt) >= new Date(weekStartsAt);
}

/** The action that leaves a card where it is. A paused card that is due returns to This week. */
export function keepAsIs(task: Task): ReviewAction {
  if (task.status === 'in-progress') return 'keep-doing';
  if (task.status === 'blocked') return 'still-waiting';
  return 'keep-todo';
}

export interface WeekOption {
  value: string; // Monday, YYYY-MM-DD
  label: string;
}

const shortDay = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The Mondays of the `count` weeks after the week that starts on `weekStart` */
export function upcomingWeeks(weekStart: string, count = 12): WeekOption[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(weekStart + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() + 7 * (i + 1));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const value = start.toISOString().slice(0, 10);

    return { value, label: `Week ${isoWeekNumber(value)} · ${shortDay(start)} – ${shortDay(end)}` };
  });
}

/** "Week 45 · 3–9 Nov", or "Week 44 · 26 Oct – 1 Nov" when the week spans two months */
export function weekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  const range =
    month(start) === month(end)
      ? `${start.getUTCDate()}–${end.getUTCDate()} ${month(end)}`
      : `${shortDay(start)} – ${shortDay(end)}`;

  return `Week ${isoWeekNumber(weekStart)} · ${range}`;
}

/** A week of the log as markdown, for status updates and timesheets */
export function weekToMarkdown(week: { weekStart: string; note: string; cards: { title: string }[] }): string {
  const parts = [`## ${weekLabel(week.weekStart)}`];
  if (week.note.trim()) parts.push(week.note.trim());
  if (week.cards.length > 0) parts.push(week.cards.map((c) => `- ${c.title}`).join('\n'));

  return parts.join('\n\n') + '\n';
}
