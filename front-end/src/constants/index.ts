import type { StatusMeta, TagColor } from '../types/task';

export const STATUSES: StatusMeta[] = [
  {
    value: 'idea',
    label: 'Ideas',
    dot: '#B9B9FF',
    countBg: 'var(--eui-bg-subdued)',
    countFg: 'var(--eui-text-subdued)',
  },
  {
    value: 'todo',
    label: 'This week',
    dot: '#5B8DEF',
    countBg: 'var(--eui-bg-base-primary)',
    countFg: 'var(--eui-text-primary)',
  },
  {
    value: 'in-progress',
    label: 'Doing',
    dot: '#FFC93C',
    countBg: 'var(--eui-bg-base-warning)',
    countFg: 'var(--eui-text-warning)',
  },
  {
    value: 'blocked',
    label: 'Blocked',
    dot: '#4FC1BE',
    countBg: 'var(--eui-bg-base-danger)',
    countFg: 'var(--eui-text-danger)',
  },
  {
    value: 'paused',
    label: 'Paused',
    dot: '#F4705A',
    countBg: 'var(--eui-bg-subdued)',
    countFg: 'var(--eui-text-subdued)',
  },
  {
    value: 'done',
    label: 'Done',
    drawer: true,
    dot: '#8FD694',
    countBg: 'var(--eui-bg-base-success)',
    countFg: 'var(--eui-text-success)',
  },
];

// Strong fills: the pill background is the same color as the picker dot.
// Text is ink, or white where white has better contrast (indigo, slate).
export const TAG_COLORS: TagColor[] = [
  { bg: '#6366F1', fg: '#FFFFFF', dot: '#6366F1' }, // indigo
  { bg: '#3B82F6', fg: '#111111', dot: '#3B82F6' }, // blue
  { bg: '#10B981', fg: '#111111', dot: '#10B981' }, // green
  { bg: '#F97316', fg: '#111111', dot: '#F97316' }, // orange
  { bg: '#EF4444', fg: '#111111', dot: '#EF4444' }, // red
  { bg: '#A855F7', fg: '#111111', dot: '#A855F7' }, // purple
  { bg: '#F59E0B', fg: '#111111', dot: '#F59E0B' }, // amber
  { bg: '#14B8A6', fg: '#111111', dot: '#14B8A6' }, // teal
  { bg: '#F43F5E', fg: '#111111', dot: '#F43F5E' }, // rose
  { bg: '#64748B', fg: '#FFFFFF', dot: '#64748B' }, // slate
];
