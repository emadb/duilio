import React from 'react';
import { STATUSES } from '../../constants';
import type { Task } from '../../types/task';

interface SummaryBarProps {
  tasks: Task[];
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ tasks }) => {
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s.value, tasks.filter((t) => t.status === s.value).length]),
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        marginBottom: 28,
        background: 'var(--eui-bg-plain)',
        border: '1px solid var(--eui-border-color)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {STATUSES.map((s, i) => (
        <div
          key={s.value}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRight:
              i < STATUSES.length - 1 ? '1px solid var(--eui-border-color)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: s.dot,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--eui-text-subdued)',
                fontFamily: 'var(--eui-font-family)',
              }}
            >
              {s.label}
            </span>
          </div>
          <span
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: s.countFg,
              fontFamily: 'var(--eui-font-family)',
              lineHeight: 1,
              paddingLeft: 12,
            }}
          >
            {counts[s.value]}
          </span>
        </div>
      ))}
    </div>
  );
};
