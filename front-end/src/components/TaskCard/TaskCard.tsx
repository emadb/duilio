import React from 'react';
import type { Task } from '../../types/task';
import type { TagColorMap } from '../../types/task';
import { TagPill } from '../common/TagPill';
import { DueBadge } from '../common/DueBadge';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  tagColorMap: TagColorMap;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, tagColorMap }) => {
  const done = task.status === 'done';
  const hasFooter = !!task.dueDate || task.tags.length > 0;

  return (
    <div
      style={{
        background: 'var(--eui-bg-plain)',
        border: '1px solid var(--eui-border-color)',
        borderRadius: 6,
        padding: '14px 16px',
        boxShadow: 'var(--eui-shadow-xs)',
        transition: 'box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--eui-shadow-m)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--eui-shadow-xs)')
      }
    >
      {/* Top: title + actions */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: task.description ? 8 : 0,
          }}
        >
          <span
            onClick={() => onEdit(task)}
            style={{
              flex: 1,
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.45,
              color: done ? 'var(--eui-text-subdued)' : 'var(--eui-title-color)',
              fontFamily: 'var(--eui-font-family)',
              cursor: 'pointer',
              textDecoration: done ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 2, marginTop: -2, flexShrink: 0 }}>
            <ActionBtn onClick={() => onEdit(task)} aria-label="Edit task" color="primary">
              <PencilIcon />
            </ActionBtn>
          </div>
        </div>

        {task.description && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--eui-text-subdued)',
              fontFamily: 'var(--eui-font-family)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* Footer: due date + tags */}
      {hasFooter && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 10,
          }}
        >
          <DueBadge dueDate={task.dueDate} status={task.status} />
          {task.tags.map((tag) => (
            <TagPill key={tag} tag={tag} tagColorMap={tagColorMap} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

interface ActionBtnProps {
  onClick: () => void;
  'aria-label': string;
  color: 'primary' | 'danger';
  children: React.ReactNode;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ onClick, color, children, ...rest }) => (
  <button
    onClick={onClick}
    {...rest}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      border: 'none',
      background: 'transparent',
      borderRadius: 'var(--eui-border-radius-medium)',
      cursor: 'pointer',
      color:
        color === 'danger' ? 'var(--eui-text-danger)' : 'var(--eui-text-primary)',
      transition: 'background 0.1s ease',
    }}
    onMouseEnter={(e) =>
      ((e.currentTarget as HTMLElement).style.background =
        color === 'danger' ? 'var(--eui-bg-base-danger)' : 'var(--eui-bg-interactive-hover)')
    }
    onMouseLeave={(e) =>
      ((e.currentTarget as HTMLElement).style.background = 'transparent')
    }
  >
    {children}
  </button>
);

const PencilIcon = () => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
  </svg>
);
