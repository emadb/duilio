import React from 'react';
import { fmtDate, isOverdue } from '../../utils/helpers';

interface DueBadgeProps {
  dueDate: string;
  status: string;
}

export const DueBadge: React.FC<DueBadgeProps> = ({ dueDate, status }) => {
  if (!dueDate) return null;
  const overdue = isOverdue(dueDate, status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontFamily: 'var(--eui-font-family)',
        fontWeight: overdue ? 600 : 400,
        color: overdue ? 'var(--eui-text-danger)' : 'var(--eui-text-subdued)',
      }}
    >
      {/* Calendar icon (inline SVG so there's no EUI import required here) */}
      <svg
        width={11}
        height={11}
        viewBox="0 0 16 16"
        fill="currentColor"
        style={{ color: overdue ? 'var(--eui-color-danger)' : 'var(--eui-color-medium-shade)' }}
      >
        <path d="M5 1a1 1 0 0 1 2 0v1h2V1a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1V1a1 1 0 0 1 1-1zm7 4H2v8h10V5z" />
      </svg>
      {fmtDate(dueDate)}
      {overdue && <span style={{ fontSize: 10, fontWeight: 600 }}>· Overdue</span>}
    </span>
  );
};
