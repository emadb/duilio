import React, { useState, useEffect } from 'react';
import type { Task, TaskStatus, TagColorMap } from '../../types/task';
import { STATUSES } from '../../constants';
import { TagInput } from '../common/TagInput';

function useIsMobile() {
  const [v, setV] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return v;
}

interface TaskModalProps {
  task: Partial<Task> | null;
  onSave: (data: Omit<Task, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  onDelete?: () => void;
  tagColorMap: TagColorMap;
  onColorAssign: (tag: string, colorIndex: number) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onSave,
  onClose,
  onDelete,
  tagColorMap,
  onColorAssign,
}) => {
  const isMobile = useIsMobile();
  const isEdit = !!task?.id;

  const [title, setTitle] = useState(task?.title ?? '');
  const [desc, setDesc] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [due, setDue] = useState(task?.dueDate ?? '');
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [titleError, setTitleError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSave() {
    if (!title.trim()) {
      setTitleError('Title is required.');
      return;
    }
    onSave({ title: title.trim(), description: desc, status, dueDate: due, tags });
  }

  const statusOptions = STATUSES.map((s) => ({ value: s.value, label: s.label }));

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--eui-bg-interactive-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? 8 : 24,
        animation: 'tmFadeIn 0.15s ease',
      }}
    >
      <div
        style={{
          background: 'var(--eui-bg-plain)',
          borderRadius: 8,
          width: '100%',
          maxWidth: 560,
          boxShadow: 'var(--eui-shadow-l)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'tmSlideIn 0.2s cubic-bezier(0.34,1.61,0.7,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 16px',
            borderBottom: '1px solid var(--eui-border-color)',
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--eui-title-color)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            {isEdit ? 'Edit task' : 'Create task'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              borderRadius: 4,
              cursor: 'pointer',
              color: 'var(--eui-text-subdued)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Title */}
          <div>
            <FieldLabel required>Title</FieldLabel>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
              placeholder="Task title"
              style={inputStyle(!!titleError)}
            />
            {titleError && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--eui-text-danger)', fontFamily: 'var(--eui-font-family)' }}>
                {titleError}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              style={{ ...inputStyle(false), resize: 'vertical', padding: '8px 12px', height: 'auto' }}
            />
          </div>

          {/* Status + Due date */}
          <div style={{ display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Status</FieldLabel>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                style={inputStyle(false)}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel hint="optional">Due date</FieldLabel>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                style={inputStyle(false)}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <FieldLabel>Tags</FieldLabel>
            <TagInput
              tags={tags}
              onChange={setTags}
              tagColorMap={tagColorMap}
              onColorAssign={onColorAssign}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--eui-text-subdued)', fontFamily: 'var(--eui-font-family)' }}>
              Type and press Enter, or pick from suggestions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            padding: '14px 24px',
            borderTop: '1px solid var(--eui-border-color)',
          }}
        >
          <div>
            {isEdit && onDelete && (
              <ModalBtn onClick={onDelete} variant="danger">Delete</ModalBtn>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ModalBtn onClick={onClose} variant="ghost">Cancel</ModalBtn>
            <ModalBtn onClick={handleSave} variant="primary">
              {isEdit ? 'Save changes' : 'Create task'}
            </ModalBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Local helpers ─────────────────────────────────────────────────────────────

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: 40,
    border: `1px solid ${invalid ? 'var(--eui-color-danger)' : 'var(--eui-form-border-color)'}`,
    borderRadius: 'var(--eui-border-radius-medium)',
    padding: '0 12px',
    fontFamily: 'var(--eui-font-family)',
    fontSize: 14,
    color: 'var(--eui-text-color)',
    background: 'var(--eui-form-background)',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

const FieldLabel: React.FC<{
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}> = ({ children, required, hint }) => (
  <label
    style={{
      display: 'block',
      marginBottom: 5,
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--eui-title-color)',
      fontFamily: 'var(--eui-font-family)',
    }}
  >
    {children}
    {required && <span style={{ color: 'var(--eui-color-danger)', marginLeft: 2 }}>*</span>}
    {hint && (
      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--eui-text-subdued)', marginLeft: 4 }}>
        ({hint})
      </span>
    )}
  </label>
);

const ModalBtn: React.FC<{
  onClick: () => void;
  variant: 'ghost' | 'primary' | 'danger';
  children: React.ReactNode;
}> = ({ onClick, variant, children }) => (
  <button
    onClick={onClick}
    style={{
      height: 40,
      padding: '0 16px',
      borderRadius: 6,
      border: variant === 'ghost' ? '1px solid var(--eui-border-color)' : 'none',
      background:
        variant === 'primary' ? 'var(--eui-color-primary)'
        : variant === 'danger' ? 'var(--eui-color-danger)'
        : 'transparent',
      color: variant === 'ghost' ? 'var(--eui-text-color)' : '#fff',
      fontFamily: 'var(--eui-font-family)',
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'opacity 0.15s ease',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
  >
    {children}
  </button>
);
