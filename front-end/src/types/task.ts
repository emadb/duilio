// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;   // ISO date string "YYYY-MM-DD" or ""
  tags: string[];
  createdAt: number; // epoch ms
}

export interface StatusMeta {
  value: TaskStatus;
  label: string;
  dot: string;
  countBg: string;
  countFg: string;
}

export interface TagColor {
  bg: string;
  fg: string;
  dot: string;
}

/** Map from tag slug → index into TAG_COLORS array */
export type TagColorMap = Record<string, number>;
