/**
 * API Service — Task Manager
 *
 * All functions are stubs. Replace the implementations with real HTTP calls
 * (fetch / axios / react-query mutations) once the backend is ready.
 *
 * Expected base URL: process.env.REACT_APP_API_BASE_URL  (e.g. /api/v1)
 *
 * REST contract assumed:
 *   GET    /tasks          → Task[]
 *   POST   /tasks          → Task          (body: Omit<Task, 'id'|'createdAt'>)
 *   PUT    /tasks/:id      → Task          (body: Partial<Task>)
 *   DELETE /tasks/:id      → { ok: true }
 *
 *   GET    /tags/colors    → TagColorMap   ({ [tag]: colorIndex })
 *   PUT    /tags/colors    → TagColorMap   (body: TagColorMap)
 */

import type { Task, TagColorMap } from '../types/task';
import { SEED_TASKS } from '../data/seed';

// ---------------------------------------------------------------------------
// In-memory fallback store (remove once real API is wired up)
// ---------------------------------------------------------------------------
let _tasks: Task[] = (() => {
  try {
    return JSON.parse(localStorage.getItem('tm_tasks') || 'null') ?? SEED_TASKS;
  } catch {
    return SEED_TASKS;
  }
})();

let _tagColors: TagColorMap = (() => {
  try {
    return JSON.parse(localStorage.getItem('tm_tagColors') || 'null') ?? {};
  } catch {
    return {};
  }
})();

function persist() {
  localStorage.setItem('tm_tasks', JSON.stringify(_tasks));
  localStorage.setItem('tm_tagColors', JSON.stringify(_tagColors));
}

/** Simulated network delay — remove in production */
function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ---------------------------------------------------------------------------
// Task endpoints
// ---------------------------------------------------------------------------

/** Fetch all tasks */
export async function fetchTasks(): Promise<Task[]> {
  // TODO: replace with → const res = await fetch(`${BASE_URL}/tasks`);
  //                       return res.json();
  return delay([..._tasks]);
}

/** Create a new task */
export async function createTask(
  data: Omit<Task, 'id' | 'createdAt'>,
): Promise<Task> {
  // TODO: replace with →
  //   const res = await fetch(`${BASE_URL}/tasks`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(data),
  //   });
  //   return res.json();
  const task: Task = {
    ...data,
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    createdAt: Date.now(),
  };
  _tasks = [..._tasks, task];
  persist();
  return delay(task);
}

/** Update an existing task */
export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>,
): Promise<Task> {
  // TODO: replace with →
  //   const res = await fetch(`${BASE_URL}/tasks/${id}`, {
  //     method: 'PUT',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(data),
  //   });
  //   return res.json();
  const idx = _tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Task ${id} not found`);
  const updated = { ..._tasks[idx], ...data };
  _tasks = [..._tasks.slice(0, idx), updated, ..._tasks.slice(idx + 1)];
  persist();
  return delay(updated);
}

/** Delete a task by id */
export async function deleteTask(id: string): Promise<void> {
  // TODO: replace with →
  //   await fetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' });
  _tasks = _tasks.filter((t) => t.id !== id);
  persist();
  return delay(undefined);
}

// ---------------------------------------------------------------------------
// Tag color endpoints
// ---------------------------------------------------------------------------

/** Fetch the full tag→colorIndex map */
export async function fetchTagColors(): Promise<TagColorMap> {
  // TODO: replace with →
  //   const res = await fetch(`${BASE_URL}/tags/colors`);
  //   return res.json();
  return delay({ ..._tagColors });
}

/** Persist the entire tag→colorIndex map */
export async function saveTagColors(map: TagColorMap): Promise<TagColorMap> {
  // TODO: replace with →
  //   const res = await fetch(`${BASE_URL}/tags/colors`, {
  //     method: 'PUT',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(map),
  //   });
  //   return res.json();
  _tagColors = { ...map };
  persist();
  return delay({ ..._tagColors });
}
