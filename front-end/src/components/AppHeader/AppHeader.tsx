import React from 'react';
import { STATUSES } from '../../constants';
import type { Task, TaskStatus } from '../../types/task';

interface AppHeaderProps {
  tasks: Task[];
  search: string;
  onSearch: (value: string) => void;
  activeStatuses: TaskStatus[];
  onToggleStatus: (status: TaskStatus) => void;
  layout: 'grid' | 'list';
  onToggleLayout: () => void;
  onCreateTask: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  tasks,
  search,
  onSearch,
  activeStatuses,
  onToggleStatus,
  layout,
  onToggleLayout,
  onCreateTask,
}) => {
  return (
    <header
      style={{
        background: 'var(--eui-header-background)',
        borderBottom: '1px solid var(--eui-header-border-color)',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo / App name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="var(--eui-color-primary)"
        >
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
          <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
        </svg>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--eui-title-color)',
            fontFamily: 'var(--eui-font-family)',
            letterSpacing: '-0.01em',
          }}
        >
          Task Manager
        </span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 300 }}>
        <div style={{ position: 'relative' }}>
          <svg
            width={14}
            height={14}
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--eui-text-subdued)',
              pointerEvents: 'none',
            }}
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search tasks, tags…"
            style={{
              width: '100%',
              height: 32,
              border: '1px solid var(--eui-form-border-color)',
              borderRadius: 'var(--eui-border-radius-medium)',
              padding: '0 12px 0 32px',
              fontFamily: 'var(--eui-font-family)',
              fontSize: 13,
              color: 'var(--eui-text-color)',
              background: 'var(--eui-form-background)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Status filter toggles */}
      <div style={{ display: 'flex', gap: 4 }}>
        {STATUSES.map((s) => {
          const active = activeStatuses.includes(s.value);
          const count = tasks.filter((t) => t.status === s.value).length;
          return (
            <button
              key={s.value}
              onClick={() => onToggleStatus(s.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 28,
                padding: '0 10px',
                border: active
                  ? `1.5px solid ${s.dot}`
                  : '1px solid var(--eui-border-color)',
                borderRadius: 4,
                background: active ? 'var(--eui-bg-plain)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--eui-font-family)',
                fontSize: 12,
                fontWeight: 500,
                color: active ? 'var(--eui-title-color)' : 'var(--eui-text-subdued)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: active ? s.dot : 'var(--eui-border-color)',
                  transition: 'background 0.15s ease',
                }}
              />
              {s.label}
              <span
                style={{
                  background: active ? s.countBg : 'var(--eui-bg-subdued)',
                  color: active ? s.countFg : 'var(--eui-text-subdued)',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Layout toggle + Create */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
        <button
          onClick={onToggleLayout}
          title={layout === 'grid' ? 'Switch to list' : 'Switch to grid'}
          aria-label={layout === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            border: '1px solid var(--eui-border-color)',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--eui-text-subdued)',
            transition: 'background 0.1s ease',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              'var(--eui-bg-interactive-hover)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'transparent')
          }
        >
          {layout === 'grid' ? <ListIcon /> : <GridIcon />}
        </button>

        <button
          onClick={onCreateTask}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 14px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--eui-color-primary)',
            color: '#fff',
            fontFamily: 'var(--eui-font-family)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
          </svg>
          Create task
        </button>
      </div>
    </header>
  );
};

const GridIcon = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
  </svg>
);

const ListIcon = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
  </svg>
);
