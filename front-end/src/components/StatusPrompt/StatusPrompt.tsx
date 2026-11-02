import React, { useEffect, useState } from 'react';
import type { Task } from '../../types/task';
import type { WeekOption } from '../../utils/helpers';
import { StatusFields } from './StatusFields';
import { GHOST_BTN, PRIMARY_BTN } from '../../utils/styles';

export type PromptStatus = 'blocked' | 'paused';

export interface StatusExtra {
  waitingOn?: string;
  pausedUntil?: string;
}

interface StatusPromptProps {
  task: Task;
  status: PromptStatus;
  weeks: WeekOption[];
  onConfirm: (extra: StatusExtra) => void;
  onClose: () => void;
}

/** Asks the extra data a card needs before it moves to Blocked or Paused. */
export const StatusPrompt: React.FC<StatusPromptProps> = ({
  task,
  status,
  weeks,
  onConfirm,
  onClose,
}) => {
  const [waitingOn, setWaitingOn] = useState(task.waitingOn);
  const [pausedUntil, setPausedUntil] = useState(task.pausedUntil || weeks[0]?.value || '');
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function confirm() {
    if (status === 'blocked') {
      if (!waitingOn.trim()) {
        setError('Write who or what is blocking it.');
        return;
      }
      onConfirm({ waitingOn: waitingOn.trim() });
      return;
    }
    if (!pausedUntil) {
      setError('Choose a return week.');
      return;
    }
    onConfirm({ pausedUntil });
  }

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
          borderRadius: 'var(--eui-border-radius-large)',
          border: 'var(--eui-outline)',
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--eui-shadow-l)',
          animation: 'tmSlideIn 0.2s cubic-bezier(0.34,1.61,0.7,1)',
          padding: 24,
        }}
      >
        <p style={titleStyle}>
          {status === 'blocked' ? 'Move to Blocked' : 'Move to Paused'}
        </p>
        <p style={subtitleStyle}>{task.title}</p>

        <StatusFields
          status={status}
          waitingOn={waitingOn}
          pausedUntil={pausedUntil}
          weeks={weeks}
          error={error}
          onWaitingOn={(v) => { setWaitingOn(v); setError(''); }}
          onPausedUntil={(v) => { setPausedUntil(v); setError(''); }}
          onEnter={confirm}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button onClick={onClose} style={btnStyle('ghost')}>Cancel</button>
          <button onClick={confirm} style={btnStyle('primary')}>Move</button>
        </div>
      </div>
    </div>
  );
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: 17,
  fontWeight: 600,
  color: 'var(--eui-title-color)',
  fontFamily: 'var(--eui-font-family)',
};

const subtitleStyle: React.CSSProperties = {
  margin: '0 0 18px',
  fontSize: 14,
  color: 'var(--eui-text-subdued)',
  fontFamily: 'var(--eui-font-family)',
};

function btnStyle(variant: 'ghost' | 'primary'): React.CSSProperties {
  return {
    height: 40,
    padding: '0 16px',
    borderRadius: 'var(--eui-border-radius-medium)',
    ...(variant === 'primary' ? PRIMARY_BTN : GHOST_BTN),
    fontFamily: 'var(--eui-font-family)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  };
}
