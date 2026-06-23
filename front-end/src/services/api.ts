import type { Task, TagColorMap } from '../types/task';
import { TAG_COLORS } from '../constants';
import { autoColorIndex } from '../utils/helpers';

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
  status: 'todo' | 'in-progress' | 'done';
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
    throw new Error(msg);
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
    createdAt: Date.now() - index, // preserve backend DESC order
  };
}

// ── Tag helpers ───────────────────────────────────────────────────────────────

async function ensureTag(name: string, colorIndex: number): Promise<string> {
  const cached = _tagCache.get(name);
  if (cached) return cached.id;

  const color = TAG_COLORS[colorIndex % TAG_COLORS.length].dot;
  try {
    const tag = await request<BackendTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    _tagCache.set(name, tag);
    return tag.id;
  } catch {
    // Tag already exists for this user — refetch to populate cache
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

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt'>,
): Promise<Task> {
  const tagIds = await Promise.all(data.tags.map((name) => ensureTag(name, 0)));
  const todo = await request<BackendTodo>('/todos', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate || null,
      status: data.status,
      tagIds,
    }),
  });
  return todoToTask(todo, 0);
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>,
): Promise<Task> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.status !== undefined) body.status = data.status;
  if (data.dueDate !== undefined) body.dueDate = data.dueDate || null;
  if (data.tags !== undefined) {
    body.tagIds = await Promise.all(data.tags.map((name) => ensureTag(name, 0)));
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

// ── Tag color endpoints ───────────────────────────────────────────────────────

export async function fetchTagColors(): Promise<TagColorMap> {
  const tags = await request<BackendTag[]>('/tags');
  tags.forEach((t) => _tagCache.set(t.name, t));

  // Derive color index from the hex stored on each tag
  const backendMap: TagColorMap = {};
  tags.forEach((tag) => {
    const idx = TAG_COLORS.findIndex(
      (c) => c.dot.toLowerCase() === tag.color.toLowerCase(),
    );
    backendMap[tag.name] = idx >= 0 ? idx : autoColorIndex(tag.name);
  });

  // Merge with localStorage overrides (from assignTagColor)
  try {
    const saved = JSON.parse(localStorage.getItem('tm_tagColors') || 'null') as TagColorMap | null;
    if (saved) return { ...backendMap, ...saved };
  } catch { /* ignore */ }

  return backendMap;
}

export async function saveTagColors(map: TagColorMap): Promise<TagColorMap> {
  localStorage.setItem('tm_tagColors', JSON.stringify(map));
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
