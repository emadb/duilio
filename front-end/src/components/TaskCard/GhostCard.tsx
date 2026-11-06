import React, { useState } from 'react';

interface GhostCardProps {
  onClick: () => void;
}

/** A faint card at the end of a column. It opens the task modal for that column. */
export const GhostCard: React.FC<GhostCardProps> = ({ onClick }) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        width: '100%',
        border: '1.5px dashed var(--eui-ink)',
        borderRadius: 'var(--eui-border-radius-large)',
        background: hover ? 'var(--eui-bg-plain)' : 'transparent',
        color: 'var(--eui-text-subdued)',
        fontFamily: 'var(--eui-font-family)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--eui-border-color)',
          color: 'var(--eui-text-subdued)',
          display: 'inline-grid',
          placeItems: 'center',
          fontSize: 15,
          lineHeight: 1,
        }}
      >
        +
      </span>
      Add task
    </button>
  );
};
