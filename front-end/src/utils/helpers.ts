import { TAG_COLORS } from '../constants';
import type { TagColor } from '../types/task';

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
