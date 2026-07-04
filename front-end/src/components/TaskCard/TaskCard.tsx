import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [dragging, setDragging] = React.useState(false);
  const done = task.status === 'done';
  const hasFooter = !!task.dueDate || task.tags.length > 0;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      style={{
        background: 'var(--eui-bg-plain)',
        border: '1px solid var(--eui-border-color)',
        borderRadius: 6,
        padding: '14px 16px',
        boxShadow: 'var(--eui-shadow-xs)',
        transition: 'box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'grab',
        opacity: dragging ? 0.4 : 1,
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
          <div
            className="task-card-description"
            style={{
              fontSize: 13,
              color: 'var(--eui-text-subdued)',
              fontFamily: 'var(--eui-font-family)',
              lineHeight: 1.5,
              maxHeight: '4.5em',
              overflow: 'hidden',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {task.description}
            </ReactMarkdown>
          </div>
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

// Compact overrides so headings/lists don't blow up the card's small footprint.
const markdownComponents: Components = {
  p: ({ children }) => <p style={{ margin: '0 0 4px' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: 0, paddingLeft: 18 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: 0, paddingLeft: 18 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ color: 'var(--eui-color-primary)' }}
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code
      style={{
        background: 'var(--eui-bg-base-subdued)',
        borderRadius: 3,
        padding: '1px 4px',
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      {children}
    </code>
  ),
  h1: ({ children }) => <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{children}</p>,
  h2: ({ children }) => <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{children}</p>,
  h3: ({ children }) => <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{children}</p>,
};

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
