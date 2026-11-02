import React, { useEffect, useState } from 'react';
import { importTrello, type TrelloResult } from '../../services/api';
import { GHOST_BTN, PRIMARY_BTN } from '../../utils/styles';

interface TrelloImportProps {
  onClose: () => void;
  /** Called when the user closes the dialog after cards were imported */
  onImported: () => void;
}

const LISTS: { key: keyof TrelloResult['counts']; label: string }[] = [
  { key: 'idea', label: 'Ideas' },
  { key: 'todo', label: 'This week' },
  { key: 'inProgress', label: 'Doing' },
  { key: 'blocked', label: 'Waiting on' },
  { key: 'done', label: 'Done' },
];

/** Import a Trello board export: choose the file, check the counts, confirm. */
export const TrelloImport: React.FC<TrelloImportProps> = ({ onClose, onImported }) => {
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState<TrelloResult | null>(null);
  const [done, setDone] = useState<TrelloResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => (done ? onImported() : onClose());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  async function choose(file: File | undefined) {
    if (!file) return;
    setError('');
    setPreview(null);
    setBusy(true);
    try {
      const text = await file.text();
      setPreview(await importTrello(text, true));
      setJson(text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError('');
    setBusy(true);
    try {
      setDone(await importTrello(json, false));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shown = done ?? preview;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && close()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--eui-bg-interactive-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div style={panelStyle}>
        <p style={titleStyle}>Import from Trello</p>
        <p style={subtleStyle}>
          Export the board as JSON from Trello (Menu → Print, export and share → Export as JSON), then choose the file.
        </p>

        {!done && (
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => choose(e.target.files?.[0])}
            style={{ margin: '12px 0', fontSize: 13 }}
          />
        )}

        {shown && (
          <div data-testid="import-counts">
            <p style={{ ...subtleStyle, color: 'var(--eui-title-color)', fontWeight: 600 }}>
              {done ? `Imported ${shown.total} cards` : `${shown.total} cards will be imported`}
            </p>
            <ul style={{ margin: '4px 0 10px', paddingLeft: 18, fontSize: 13, fontFamily: font }}>
              {LISTS.map((l) => <li key={l.key}>{l.label}: {shown.counts[l.key]}</li>)}
            </ul>
            {shown.archived > 0 && <p style={subtleStyle}>{shown.archived} archived cards are skipped.</p>}
            {shown.unknownLists.length > 0 && (
              <p style={subtleStyle}>
                Not imported, unknown lists: {shown.unknownLists.join(', ')}.
              </p>
            )}
            {shown.counts.blocked > 0 && (
              <p style={subtleStyle}>
                Waiting cards have no name yet. Sort them out in the first weekly review.
              </p>
            )}
          </div>
        )}

        {!done && (
          <p style={{ ...subtleStyle, color: 'var(--eui-text-warning)', marginTop: 10 }}>
            Duilio does not detect duplicates. Importing the same board twice adds every card twice.
          </p>
        )}

        {error && <p style={{ ...subtleStyle, color: 'var(--eui-text-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={close} style={btnStyle(false)}>{done ? 'Close' : 'Cancel'}</button>
          {!done && (
            <button
              onClick={confirm}
              disabled={!preview || preview.total === 0 || busy}
              style={{ ...btnStyle(true), opacity: !preview || preview.total === 0 || busy ? 0.5 : 1 }}
            >
              {busy ? 'Working…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const font = 'var(--eui-font-family)';

const panelStyle: React.CSSProperties = {
  background: 'var(--eui-bg-plain)',
  borderRadius: 'var(--eui-border-radius-large)',
  border: 'var(--eui-outline)',
  width: '100%',
  maxWidth: 480,
  boxShadow: 'var(--eui-shadow-l)',
  padding: 24,
  fontFamily: font,
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 17,
  fontWeight: 600,
  color: 'var(--eui-title-color)',
  fontFamily: font,
};

const subtleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 13,
  color: 'var(--eui-text-subdued)',
  fontFamily: font,
};

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    height: 40,
    padding: '0 16px',
    borderRadius: 'var(--eui-border-radius-medium)',
    ...(primary ? PRIMARY_BTN : GHOST_BTN),
    fontFamily: font,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  };
}
