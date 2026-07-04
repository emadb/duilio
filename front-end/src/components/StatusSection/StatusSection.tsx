import React, { useState, useRef } from 'react';
import { TaskCard } from '../TaskCard/TaskCard';
import type { Task, StatusMeta, TagColorMap, TaskStatus } from '../../types/task';

interface StatusSectionProps {
  status: StatusMeta;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onAdd: (status: string) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onToggleImportant: (id: string) => void;
  tagColorMap: TagColorMap;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  status,
  tasks,
  onEdit,
  onAdd,
  onDropTask,
  onToggleImportant,
  tagColorMap,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // dragenter/dragleave fire on every child; count them to know when we truly leave
  const dragDepth = useRef(0);

  return (
    <div
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('text/task-id')) return;
        dragDepth.current += 1;
        setDragOver(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('text/task-id')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragOver(false);
        const taskId = e.dataTransfer.getData('text/task-id');
        if (taskId) onDropTask(taskId, status.value);
      }}
      style={{
        background: dragOver ? 'var(--eui-bg-base-primary)' : 'var(--eui-bg-subdued)',
        border: dragOver
          ? '1px dashed var(--eui-color-primary)'
          : '1px solid var(--eui-border-color)',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        flex: '1 0 280px',
        minWidth: 280,
        maxWidth: 360,
        minHeight: 220,
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: collapsed ? 0 : 10,
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            flex: 1,
            textAlign: 'left',
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{
              color: 'var(--eui-text-subdued)',
              flexShrink: 0,
              transition: 'transform 0.15s ease',
              transform: collapsed ? 'none' : 'rotate(90deg)',
            }}
          >
            <path
              fillRule="evenodd"
              d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
            />
          </svg>

          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: status.dot,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />

          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: 'var(--eui-text-subdued)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            {status.label}
          </span>

          <span
            style={{
              background: status.countBg,
              color: status.countFg,
              borderRadius: 999,
              padding: '1px 8px',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--eui-font-family)',
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {tasks.length}
          </span>
        </button>

        {/* Add task shortcut */}
        <button
          onClick={() => onAdd(status.value)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--eui-text-primary)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--eui-font-family)',
            padding: '2px 6px',
            borderRadius: 4,
            transition: 'background 0.1s ease',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'var(--eui-bg-base-primary)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'none')
          }
        >
          <svg width={11} height={11} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
          </svg>
          Add task
        </button>
      </div>

      {/* Card stack */}
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 64 }}>
          {tasks.length === 0 ? (
            <div
              style={{
                padding: 20,
                border: '1px dashed var(--eui-border-color)',
                borderRadius: 6,
                textAlign: 'center',
                color: 'var(--eui-text-subdued)',
                fontSize: 13,
                fontFamily: 'var(--eui-font-family)',
              }}
            >
              No tasks —{' '}
              <button
                onClick={() => onAdd(status.value)}
                style={{
                  color: 'var(--eui-text-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--eui-font-family)',
                  padding: 0,
                }}
              >
                add one
              </button>
            </div>
          ) : (
            tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={onEdit}
                onToggleImportant={onToggleImportant}
                tagColorMap={tagColorMap}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
