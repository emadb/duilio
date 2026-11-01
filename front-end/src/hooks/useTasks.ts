import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TaskDraft, TaskStatus, TagColorMap } from '../types/task';
import type { StatusExtra } from '../components/StatusPrompt/StatusPrompt';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchTagColors,
  fetchCurrentWeek,
  saveTagColors,
  ApiError,
  type Week,
} from '../services/api';

interface UseTasksReturn {
  tasks: Task[];
  tagColorMap: TagColorMap;
  week: Week | null;
  loading: boolean;
  error: string | null;
  addTask: (data: TaskDraft) => Promise<void>;
  editTask: (id: string, data: Partial<TaskDraft>) => Promise<void>;
  moveTask: (id: string, status: TaskStatus, extra?: StatusExtra) => Promise<void>;
  toggleImportant: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  assignTagColor: (tag: string, colorIndex: number) => void;
}

export function useTasks(onUnauthorized?: () => void): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tagColorMap, setTagColorMap] = useState<TagColorMap>({});
  const [week, setWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, c, w] = await Promise.all([fetchTasks(), fetchTagColors(), fetchCurrentWeek()]);
        if (!cancelled) {
          setTasks(t);
          setTagColorMap(c);
          setWeek(w);
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

  const addTask = useCallback(async (data: TaskDraft) => {
    const task = await createTask(data);
    setTasks((prev) => [...prev, task]);
  }, []);

  const editTask = useCallback(
    async (id: string, data: Partial<TaskDraft>) => {
      const updated = await updateTask(id, data);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [],
  );

  // Optimistic status change (drag & drop): move the card immediately, revert on failure
  const moveTask = useCallback(async (id: string, status: TaskStatus, extra: StatusExtra = {}) => {
    // Read the current status from the ref: a setState updater may run later than this line
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current || current.status === status) return;

    const previous = current.status;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, ...extra } : t)));
    try {
      // The server sets the status-dependent fields (since, completed, ...): use its answer
      const saved = await updateTask(id, { status, ...extra });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...saved, createdAt: t.createdAt } : t)));
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: previous } : t)));
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

  return { tasks, tagColorMap, week, loading, error, addTask, editTask, moveTask, toggleImportant, removeTask, assignTagColor };
}
