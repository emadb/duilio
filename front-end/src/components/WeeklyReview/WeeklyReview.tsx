import React, { useState } from 'react';
import type { ReviewAction, ReviewDecision, Task } from '../../types/task';
import { STATUSES } from '../../constants';
import { Badge } from '../common/Badge';
import { cardBadges, isoWeekNumber, keepAsIs, type WeekOption } from '../../utils/helpers';

interface WeeklyReviewProps {
  cards: Task[];
  weekStart: string;
  weeks: WeekOption[];
  onComplete: (decisions: ReviewDecision[], note: string) => Promise<void>;
  onLater: () => void;
}

const ACTIONS: { value: ReviewAction; label: string; only?: Task['status'] }[] = [
  { value: 'keep-todo', label: 'Keep in This week' },
  { value: 'keep-doing', label: 'Keep in Doing' },
  { value: 'still-waiting', label: 'Still waiting', only: 'blocked' },
  { value: 'to-ideas', label: 'Back to Ideas' },
  { value: 'pause', label: 'Pause' },
  { value: 'delete', label: 'Delete' },
];

type Decisions = Record<string, ReviewDecision>;

const statusLabel = (task: Task) => STATUSES.find((s) => s.value === task.status)?.label ?? task.status;

/** Full-screen Monday review: every unfinished card needs a decision. */
export const WeeklyReview: React.FC<WeeklyReviewProps> = ({
  cards,
  weekStart,
  weeks,
  onComplete,
  onLater,
}) => {
  const [decisions, setDecisions] = useState<Decisions>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const left = cards.filter((c) => !decisions[c.id]).length;
  const now = new Date();

  function decide(task: Task, action: ReviewAction) {
    const pausedUntil = action === 'pause' ? decisions[task.id]?.pausedUntil ?? weeks[0]?.value : undefined;
    setDecisions((prev) => ({ ...prev, [task.id]: { id: task.id, action, pausedUntil } }));
  }

  /** Bulk buttons only fill the cards that have no decision yet. */
  function fillRemaining(pick: (task: Task) => ReviewAction) {
    setDecisions((prev) => {
      const next = { ...prev };
      cards.filter((c) => !prev[c.id]).forEach((c) => {
        next[c.id] = { id: c.id, action: pick(c) };
      });
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await onComplete(cards.map((c) => decisions[c.id]), note);
    } catch (e) {
      setError((e as Error).message || 'The review could not be saved.');
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eui-page-background)' }}>
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={titleStyle}>Weekly review · Week {isoWeekNumber(weekStart)}</h1>
        <p style={subtleStyle}>
          Decide what happens to each unfinished card. Nothing moves on without a decision.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0' }}>
          <button onClick={() => fillRemaining(keepAsIs)} style={pillStyle(false)}>Keep all as they are</button>
          <button onClick={() => fillRemaining(() => 'to-ideas')} style={pillStyle(false)}>Move all remaining to Ideas</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((task) => {
            const chosen = decisions[task.id];

            return (
              <div key={task.id} data-card={task.title} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--eui-title-color)', fontSize: 15 }}>
                    {task.title}
                  </span>
                  <Badge label={statusLabel(task)} />
                  {cardBadges(task, now).map((b) => <Badge key={b} label={b} />)}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {ACTIONS.filter((a) => !a.only || a.only === task.status).map((a) => (
                    <button
                      key={a.value}
                      onClick={() => decide(task, a.value)}
                      style={pillStyle(chosen?.action === a.value, a.value === 'delete')}
                    >
                      {a.label}
                    </button>
                  ))}

                  {chosen?.action === 'pause' && (
                    <select
                      aria-label="Back in week"
                      value={chosen.pausedUntil}
                      onChange={(e) =>
                        setDecisions((prev) => ({
                          ...prev,
                          [task.id]: { ...chosen, pausedUntil: e.target.value },
                        }))
                      }
                      style={selectStyle}
                    >
                      {weeks.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <label style={{ ...subtleStyle, display: 'block', margin: '24px 0 6px' }}>
          Note about last week (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={textareaStyle}
        />

        {error && <p style={{ color: 'var(--eui-text-danger)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={submit} disabled={left > 0 || saving} style={primaryStyle(left > 0 || saving)}>
            {saving ? 'Saving…' : 'Complete review'}
          </button>
          <button onClick={onLater} disabled={saving} style={pillStyle(false)}>Review later</button>
          <span style={subtleStyle}>
            {left > 0 ? `${left} of ${cards.length} left` : 'All cards decided'}
          </span>
        </div>
      </main>
    </div>
  );
};

const font = 'var(--eui-font-family)';

const titleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--eui-title-color)',
  fontFamily: font,
};

const subtleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: 'var(--eui-text-subdued)',
  fontFamily: font,
};

const rowStyle: React.CSSProperties = {
  background: 'var(--eui-bg-plain)',
  border: '1px solid var(--eui-border-color)',
  borderRadius: 6,
  padding: '14px 16px',
  boxShadow: 'var(--eui-shadow-xs)',
  fontFamily: font,
};

function pillStyle(selected: boolean, danger = false): React.CSSProperties {
  const color = danger ? 'var(--eui-color-danger)' : 'var(--eui-color-primary)';

  return {
    height: 32,
    padding: '0 12px',
    borderRadius: 6,
    border: `1px solid ${selected ? color : 'var(--eui-border-color)'}`,
    background: selected ? color : 'transparent',
    color: selected ? '#fff' : 'var(--eui-text-color)',
    fontFamily: font,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };
}

function primaryStyle(disabled: boolean): React.CSSProperties {
  return {
    ...pillStyle(true),
    height: 40,
    padding: '0 18px',
    fontSize: 14,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const selectStyle: React.CSSProperties = {
  height: 32,
  border: '1px solid var(--eui-form-border-color)',
  borderRadius: 6,
  padding: '0 8px',
  fontFamily: font,
  fontSize: 13,
  background: 'var(--eui-form-background)',
  color: 'var(--eui-text-color)',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--eui-form-border-color)',
  borderRadius: 6,
  padding: '8px 12px',
  fontFamily: font,
  fontSize: 14,
  background: 'var(--eui-form-background)',
  color: 'var(--eui-text-color)',
};
