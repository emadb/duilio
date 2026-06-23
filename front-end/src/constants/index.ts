import type { StatusMeta, TagColor } from '../types/task';

export const STATUSES: StatusMeta[] = [
  {
    value: 'todo',
    label: 'To Do',
    dot: '#8E9FBC',
    countBg: 'var(--eui-bg-subdued)',
    countFg: 'var(--eui-text-subdued)',
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    dot: '#EAAE01',
    countBg: 'var(--eui-bg-base-warning)',
    countFg: 'var(--eui-text-warning)',
  },
  {
    value: 'done',
    label: 'Done',
    dot: '#24C292',
    countBg: 'var(--eui-bg-base-success)',
    countFg: 'var(--eui-text-success)',
  },
];

export const TAG_COLORS: TagColor[] = [
  { bg: '#EEF2FF', fg: '#3730A3', dot: '#6366F1' }, // indigo
  { bg: '#EFF6FF', fg: '#1D4ED8', dot: '#3B82F6' }, // blue
  { bg: '#ECFDF5', fg: '#065F46', dot: '#10B981' }, // green
  { bg: '#FFF7ED', fg: '#9A3412', dot: '#F97316' }, // orange
  { bg: '#FEF2F2', fg: '#991B1B', dot: '#EF4444' }, // red
  { bg: '#FDF4FF', fg: '#7E22CE', dot: '#A855F7' }, // purple
  { bg: '#FFFBEB', fg: '#92400E', dot: '#F59E0B' }, // amber
  { bg: '#F0FDFA', fg: '#134E4A', dot: '#14B8A6' }, // teal
  { bg: '#FFF1F2', fg: '#9F1239', dot: '#F43F5E' }, // rose
  { bg: '#F1F5F9', fg: '#334155', dot: '#64748B' }, // slate
];

export const PRESET_TAGS: string[] = [
  'bug', 'feature', 'urgent', 'backend', 'frontend',
  'design', 'review', 'docs', 'devops', 'security',
];
