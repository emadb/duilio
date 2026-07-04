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
  onToggleImportant: (id: string) => void;
  tagColorMap: TagColorMap;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onToggleImportant, tagColorMap }) => {
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
            <FlagBtn
              important={task.important}
              onClick={() => onToggleImportant(task.id)}
            />
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

// Flag toggle: filled red when important, subdued outline otherwise.
const FlagBtn: React.FC<{ important: boolean; onClick: () => void }> = ({
  important,
  onClick,
}) => (
  <button
    onClick={onClick}
    aria-label={important ? 'Unmark as important' : 'Mark as important'}
    aria-pressed={important}
    title={important ? 'Unmark as important' : 'Mark as important'}
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
      color: important ? 'var(--eui-color-danger)' : 'var(--eui-text-subdued)',
      opacity: important ? 1 : 0.55,
      transition: 'background 0.1s ease, opacity 0.1s ease, transform 0.1s ease',
      transform: important ? 'scale(1.1)' : 'none',
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = 'var(--eui-bg-base-danger)';
      el.style.opacity = '1';
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = 'transparent';
      el.style.opacity = important ? '1' : '0.55';
    }}
  >
    {important ? <FlagFilledIcon /> : <FlagOutlineIcon />}
  </button>
);

const FlagFilledIcon = () => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor">
    <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12.435 12.435 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A19.626 19.626 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a19.587 19.587 0 0 0 1.349-.476l.019-.007.004-.002h.001" />
  </svg>
);

const FlagOutlineIcon = () => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor">
    <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12.435 12.435 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A19.626 19.626 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a19.587 19.587 0 0 0 1.349-.476l.019-.007.004-.002h.001A.5.5 0 0 1 14.778.085zM14 1.221c-.22.078-.48.167-.766.255-.81.252-1.872.523-2.734.523-.886 0-1.592-.286-2.203-.534l-.008-.003C7.662 1.21 7.139 1 6.5 1c-.669 0-1.606.229-2.415.478A21.294 21.294 0 0 0 3 1.845v6.433c.22-.078.48-.167.766-.255C4.576 7.77 5.638 7.5 6.5 7.5c.847 0 1.548.28 2.158.525l.028.01c.597.24 1.097.465 1.814.465.669 0 1.606-.229 2.415-.478A21.317 21.317 0 0 0 14 7.655V1.222z" />
  </svg>
);

const PencilIcon = () => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
  </svg>
);
