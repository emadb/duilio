// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskStatus = 'idea' | 'todo' | 'in-progress' | 'blocked' | 'paused' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;   // ISO date string "YYYY-MM-DD" or ""
  tags: string[];
  important: boolean;
  createdAt: number; // epoch ms
  /** Who the task waits on, "" when not blocked */
  waitingOn: string;
  /** Monday (YYYY-MM-DD) of the return week, "" when not paused */
  pausedUntil: string;
  // Set by the server on status changes
  statusChangedAt: string; // ISO timestamp
  waitingSince: string;    // ISO timestamp or ""
  completedAt: string;     // ISO timestamp or ""
  rolloverCount: number;
}

/** The part of a task the user edits; the server sets the rest. */
export type TaskDraft = Omit<
  Task,
  'id' | 'createdAt' | 'statusChangedAt' | 'waitingSince' | 'completedAt' | 'rolloverCount'
>;

export interface StatusMeta {
  value: TaskStatus;
  label: string;
  /** Shown in a drawer instead of a board column */
  drawer?: boolean;
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
