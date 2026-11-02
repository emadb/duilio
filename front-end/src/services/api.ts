import type { Task, TaskDraft, TaskStatus, TagColorMap, ReviewDecision } from '../types/task';
import { TAG_COLORS } from '../constants';
import { autoColorIndex } from '../utils/helpers';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Auth state ────────────────────────────────────────────────────────────────

let _authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null): void {
  _authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export interface Week {
  weekStart: string;  // Monday, YYYY-MM-DD
  startsAt: string;   // ISO instant of Monday 00:00 in the user's time zone
  reviewedAt: string | null;
  note: string;
}

export interface Review {
  weekStart: string;
  needsReview: boolean;
  cards: Task[];
}

export interface LogWeek {
  weekStart: string; // Monday, YYYY-MM-DD
  count: number;
  note: string;
  cards: Task[];
}

export interface TrelloResult {
  dryRun: boolean;
  total: number;
  counts: Record<'idea' | 'todo' | 'inProgress' | 'blocked' | 'done', number>;
  archived: number;
  unknownLists: string[];
  warning: string;
}

// ── Tag cache (name → BackendTag) ─────────────────────────────────────────────

interface BackendTag {
  id: string;
  name: string;
  color: string;
}

const _tagCache = new Map<string, BackendTag>();

// ── Backend shapes ────────────────────────────────────────────────────────────

interface BackendTodo {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: TaskStatus;
  important: boolean;
  statusChangedAt: string;
  waitingOn: string | null;
  waitingSince: string | null;
  pausedUntil: string | null;
  completedAt: string | null;
  rolloverCount: number;
  tags: BackendTag[];
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers as HeadersInit);
  if (_authToken) headers.set('Authorization', `Bearer ${_authToken}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`/api${path}`, { ...init, headers });

  if (!res.ok) {
    if (res.status === 401) setAuthToken(null);
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* non-JSON body */ }
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Data mapping ──────────────────────────────────────────────────────────────

function extractDate(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10); // "2026-06-21T00:00:00Z" → "2026-06-21"
}

function todoToTask(todo: BackendTodo, index: number): Task {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    dueDate: extractDate(todo.dueDate),
    tags: todo.tags.map((t) => t.name),
    important: todo.important,
    createdAt: Date.now() - index, // preserve backend DESC order
    waitingOn: todo.waitingOn ?? '',
    pausedUntil: todo.pausedUntil ?? '',
    statusChangedAt: todo.statusChangedAt,
    waitingSince: todo.waitingSince ?? '',
    completedAt: todo.completedAt ?? '',
    rolloverCount: todo.rolloverCount,
  };
}

// ── Tag helpers ───────────────────────────────────────────────────────────────

const COLORS_KEY = 'tm_tagColors';

/** Colors picked in this browser for tags that may not exist on the server yet */
function readSavedColors(): TagColorMap {
  try {
    return (JSON.parse(localStorage.getItem(COLORS_KEY) || 'null') as TagColorMap | null) ?? {};
  } catch {
    return {};
  }
}

const colorHex = (index: number) => TAG_COLORS[index % TAG_COLORS.length].dot;

async function ensureTag(name: string): Promise<string> {
  const cached = _tagCache.get(name);
  if (cached) return cached.id;

  const color = colorHex(readSavedColors()[name] ?? autoColorIndex(name));
  try {
    const tag = await request<BackendTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    _tagCache.set(name, tag);
    return tag.id;
  } catch (err) {
    const msg = (err as Error).message;
    // Only retry on "already exists" — let all other errors (network, 401, 500) propagate
    if (!msg.includes('already exists')) throw err;
    const tags = await request<BackendTag[]>('/tags');
    tags.forEach((t) => _tagCache.set(t.name, t));
    const found = _tagCache.get(name);
    if (!found) throw new Error(`Tag "${name}" could not be created or found`);
    return found.id;
  }
}

// ── Task endpoints ────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const todos = await request<BackendTodo[]>('/todos');
  return todos.map(todoToTask);
}

export async function createTask(data: TaskDraft): Promise<Task> {
  const tagIds = await Promise.all(data.tags.map((name) => ensureTag(name)));
  const todo = await request<BackendTodo>('/todos', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate || null,
      status: data.status,
      waitingOn: data.waitingOn || null,
      pausedUntil: data.pausedUntil || null,
      important: data.important,
      tagIds,
    }),
  });
  return todoToTask(todo, 0);
}

export async function updateTask(
  id: string,
  data: Partial<TaskDraft>,
): Promise<Task> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.status !== undefined) body.status = data.status;
  if (data.waitingOn) body.waitingOn = data.waitingOn;
  if (data.pausedUntil) body.pausedUntil = data.pausedUntil;
  if (data.important !== undefined) body.important = data.important;
  if (data.dueDate !== undefined) body.dueDate = data.dueDate || null;
  if (data.tags !== undefined) {
    body.tagIds = await Promise.all(data.tags.map((name) => ensureTag(name)));
  }

  const todo = await request<BackendTodo>(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return todoToTask(todo, 0);
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/todos/${id}`, { method: 'DELETE' });
}

export function fetchCurrentWeek(): Promise<Week> {
  return request<Week>('/weeks/current');
}

export async function fetchReview(): Promise<Review> {
  const res = await request<{ weekStart: string; needsReview: boolean; cards: BackendTodo[] }>(
    '/review',
  );
  return { ...res, cards: res.cards.map(todoToTask) };
}

export function completeReview(decisions: ReviewDecision[], note: string): Promise<Week> {
  return request<Week>('/review/complete', {
    method: 'POST',
    body: JSON.stringify({ decisions, note: note.trim() || null }),
  });
}

export async function fetchLog(): Promise<LogWeek[]> {
  const weeks = await request<(Omit<LogWeek, 'cards'> & { cards: BackendTodo[] })[]>('/log');
  return weeks.map((w) => ({ ...w, cards: w.cards.map(todoToTask) }));
}

/** Sends the text of a Trello board export. A dry run only counts the cards. */
export function importTrello(json: string, dryRun: boolean): Promise<TrelloResult> {
  return request<TrelloResult>(`/import/trello${dryRun ? '?dryRun=true' : ''}`, {
    method: 'POST',
    body: json,
  });
}

// ── Tag color endpoints ───────────────────────────────────────────────────────

function updateTagColor(id: string, color: string): Promise<BackendTag> {
  return request<BackendTag>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify({ color }) });
}

/**
 * The server stores the color of each tag. A color picked before the tag exists
 * stays in this browser until the tag is created.
 *
 * Tags made before colors were sent to the server all have the default color
 * (index 0). Their real color is only in this browser: push it to the server once.
 */
export async function fetchTagColors(): Promise<TagColorMap> {
  const tags = await request<BackendTag[]>('/tags');
  tags.forEach((t) => _tagCache.set(t.name, t));

  const colors: TagColorMap = {};
  tags.forEach((tag) => {
    const idx = TAG_COLORS.findIndex((c) => c.dot.toLowerCase() === tag.color.toLowerCase());
    colors[tag.name] = idx >= 0 ? idx : autoColorIndex(tag.name);
  });

  const saved = readSavedColors();
  const stale = tags.filter((t) => colors[t.name] === 0 && saved[t.name] !== undefined && saved[t.name] !== 0);
  const results = await Promise.allSettled(stale.map((t) => updateTagColor(t.id, colorHex(saved[t.name]))));

  const keep: TagColorMap = {};
  Object.entries(saved).forEach(([name, idx]) => {
    if (!(name in colors)) keep[name] = idx; // tag not created yet
  });
  stale.forEach((t, i) => {
    if (results[i].status === 'fulfilled') colors[t.name] = saved[t.name];
    else keep[t.name] = saved[t.name]; // try again at the next load
  });
  try { localStorage.setItem(COLORS_KEY, JSON.stringify(keep)); } catch { /* ignore */ }

  return { ...colors, ...keep };
}

export async function saveTagColors(map: TagColorMap): Promise<TagColorMap> {
  localStorage.setItem(COLORS_KEY, JSON.stringify(map));
  return map;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<void> {
  const res = await request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(res.token);
}

export async function register(email: string, password: string): Promise<void> {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): void {
  setAuthToken(null);
  _tagCache.clear();
}
