import React, { useEffect, useState } from 'react';
import { fetchLog, ApiError, type LogWeek } from '../../services/api';
import { weekLabel, weekToMarkdown } from '../../utils/helpers';

interface WeeklyLogProps {
  onBack: () => void;
  onUnauthorized: () => void;
}

/** Completed cards grouped by week, newest first. Each week can be copied as markdown. */
export const WeeklyLog: React.FC<WeeklyLogProps> = ({ onBack, onUnauthorized }) => {
  const [weeks, setWeeks] = useState<LogWeek[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetchLog()
      .then(setWeeks)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onUnauthorized();
        else setError('The log could not be loaded.');
      });
  }, [onUnauthorized]);

  async function copy(week: LogWeek) {
    try {
      await navigator.clipboard.writeText(weekToMarkdown(week));
      setCopied(week.weekStart);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError('The browser did not allow copying.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eui-page-background)' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', fontFamily: font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={onBack} style={btnStyle}>← Board</button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--eui-title-color)' }}>
            Done log
          </h1>
        </div>

        {error && <p style={{ color: 'var(--eui-text-danger)', fontSize: 13 }}>{error}</p>}
        {weeks && weeks.length === 0 && <p style={subtleStyle}>No completed cards yet.</p>}

        {weeks?.map((week) => (
          <section key={week.weekStart} data-week={week.weekStart} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--eui-title-color)' }}>
                {weekLabel(week.weekStart)}
              </h2>
              <span style={subtleStyle}>{week.count} done</span>
              <button onClick={() => copy(week)} style={{ ...btnStyle, marginLeft: 'auto' }}>
                {copied === week.weekStart ? 'Copied' : 'Copy as markdown'}
              </button>
            </div>

            {week.note && <p style={{ ...subtleStyle, fontStyle: 'italic', margin: '10px 0 0' }}>{week.note}</p>}

            <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 14, color: 'var(--eui-text-color)' }}>
              {week.cards.map((c) => <li key={c.id}>{c.title}</li>)}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
};

const font = 'var(--eui-font-family)';

const subtleStyle: React.CSSProperties = { margin: 0, fontSize: 13, color: 'var(--eui-text-subdued)' };

const cardStyle: React.CSSProperties = {
  background: 'var(--eui-bg-plain)',
  border: 'var(--eui-outline)',
  borderRadius: 'var(--eui-border-radius-large)',
  padding: '14px 16px',
  marginBottom: 16,
  boxShadow: 'var(--eui-shadow-m)',
};

const btnStyle: React.CSSProperties = {
  height: 32,
  padding: '0 12px',
  borderRadius: 'var(--eui-border-radius-medium)',
  border: 'var(--eui-outline)',
  background: 'transparent',
  color: 'var(--eui-text-color)',
  fontFamily: font,
  fontSize: 13,
  cursor: 'pointer',
};
