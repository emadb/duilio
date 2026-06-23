import React, { useEffect } from 'react';
import type { Task } from '../../types/task';

interface ConfirmDeleteProps {
  task: Task;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({ task, onConfirm, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
        padding: 24,
        animation: 'tmFadeIn 0.15s ease',
      }}
    >
      <div
        style={{
          background: 'var(--eui-bg-plain)',
          borderRadius: 8,
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--eui-shadow-l)',
          animation: 'tmSlideIn 0.2s cubic-bezier(0.34,1.61,0.7,1)',
          padding: 24,
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--eui-title-color)',
            fontFamily: 'var(--eui-font-family)',
          }}
        >
          Delete task
        </p>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: 'var(--eui-text-color)',
            fontFamily: 'var(--eui-font-family)',
            lineHeight: 1.55,
          }}
        >
          Delete <strong>"{task.title}"</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={btnStyle('ghost')}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={btnStyle('danger')}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            Delete task
          </button>
        </div>
      </div>
    </div>
  );
};

function btnStyle(variant: 'ghost' | 'danger'): React.CSSProperties {
  return {
    height: 40,
    padding: '0 16px',
    borderRadius: 6,
    border: variant === 'ghost' ? '1px solid var(--eui-border-color)' : 'none',
    background: variant === 'danger' ? 'var(--eui-color-danger)' : 'transparent',
    color: variant === 'danger' ? '#fff' : 'var(--eui-text-color)',
    fontFamily: 'var(--eui-font-family)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  };
}
