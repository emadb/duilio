import { useState, useEffect, useCallback } from 'react';
import type { Task, TagColorMap } from '../types/task';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchTagColors,
  saveTagColors,
} from '../services/api';

interface UseTasksReturn {
  tasks: Task[];
  tagColorMap: TagColorMap;
  loading: boolean;
  error: string | null;
  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  editTask: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  assignTagColor: (tag: string, colorIndex: number) => void;
}

export function useTasks(onUnauthorized?: () => void): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tagColorMap, setTagColorMap] = useState<TagColorMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          const msg = (e as Error).message;
          if (msg.includes('401') && onUnauthorized) {
            onUnauthorized();
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

  return { tasks, tagColorMap, loading, error, addTask, editTask, removeTask, assignTagColor };
}
