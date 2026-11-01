import React from 'react';
import type { TaskStatus } from '../../types/task';
import type { WeekOption } from '../../utils/helpers';

interface StatusFieldsProps {
  status: TaskStatus;
  waitingOn: string;
  pausedUntil: string;
  weeks: WeekOption[];
  error?: string;
  onWaitingOn: (value: string) => void;
  onPausedUntil: (value: string) => void;
  onEnter?: () => void;
}

/** The extra input a status needs: who for Waiting on, a return week for Paused. */
export const StatusFields: React.FC<StatusFieldsProps> = ({
  status,
  waitingOn,
  pausedUntil,
  weeks,
  error,
  onWaitingOn,
  onPausedUntil,
  onEnter,
}) => {
  if (status === 'blocked') {
    return (
      <div>
        <label style={labelStyle}>Waiting on</label>
        <input
          autoFocus
          value={waitingOn}
          onChange={(e) => onWaitingOn(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          placeholder="Who are you waiting for?"
          style={inputStyle(!!error)}
        />
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    );
  }

  if (status === 'paused') {
    // A saved return week outside the next weeks must stay selectable
    const options = weeks.some((w) => w.value === pausedUntil) || !pausedUntil
      ? weeks
      : [{ value: pausedUntil, label: `Week of ${pausedUntil}` }, ...weeks];

    return (
      <div>
        <label style={labelStyle}>Back in week</label>
        <select
          value={pausedUntil}
          onChange={(e) => onPausedUntil(e.target.value)}
          style={inputStyle(!!error)}
        >
          {options.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    );
  }

  return null;
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 5,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--eui-title-color)',
  fontFamily: 'var(--eui-font-family)',
};

const errorStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 12,
  color: 'var(--eui-text-danger)',
  fontFamily: 'var(--eui-font-family)',
};

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
