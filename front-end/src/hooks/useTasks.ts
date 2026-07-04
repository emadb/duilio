import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TaskStatus, TagColorMap } from '../types/task';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchTagColors,
  saveTagColors,
  ApiError,
} from '../services/api';

interface UseTasksReturn {
  tasks: Task[];
  tagColorMap: TagColorMap;
  loading: boolean;
  error: string | null;
  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  editTask: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  toggleImportant: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  assignTagColor: (tag: string, colorIndex: number) => void;
}

export function useTasks(onUnauthorized?: () => void): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tagColorMap, setTagColorMap] = useState<TagColorMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, c] = await Promise.all([fetchTasks(), fetchTagColors()]);
        if (!cancelled) {
          setTasks(t);
          setTagColorMap(c);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401 && onUnauthorizedRef.current) {
            onUnauthorizedRef.current();
          } else {
            setError('Failed to load tasks.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addTask = useCallback(async (data: Omit<Task, 'id' | 'createdAt'>) => {
    const task = await createTask(data);
    setTasks((prev) => [...prev, task]);
  }, []);

  const editTask = useCallback(
    async (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      const updated = await updateTask(id, data);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [],
  );

  // Optimistic status change (drag & drop): move the card immediately, revert on failure
  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    let previous: TaskStatus | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        previous = t.status;
        return { ...t, status };
      }),
    );
    if (previous === undefined || previous === status) return;
    try {
      await updateTask(id, { status });
    } catch (e) {
      const revert = previous;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: revert } : t)));
      throw e;
    }
  }, []);

  // Optimistic important toggle: flip immediately, revert on failure
  const toggleImportant = useCallback(async (id: string) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const next = !current.important;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, important: next } : t)));
    try {
      await updateTask(id, { important: next });
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, important: !next } : t)));
      throw e;
    }
  }, [tasks]);

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const assignTagColor = useCallback(
    (tag: string, colorIndex: number) => {
      setTagColorMap((prev) => {
        const next = { ...prev, [tag]: colorIndex };
        // fire-and-forget — sync to backend without blocking UI
        saveTagColors(next).catch(console.error);
        return next;
      });
    },
    [],
  );

  return { tasks, tagColorMap, loading, error, addTask, editTask, moveTask, toggleImportant, removeTask, assignTagColor };
}
