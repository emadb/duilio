import React from 'react';
import { resolveTagColor } from '../../utils/helpers';
import type { TagColorMap } from '../../types/task';

interface TagPillProps {
  tag: string;
  tagColorMap?: TagColorMap;
  onRemove?: (tag: string) => void;
  size?: 'sm' | 'md';
}

export const TagPill: React.FC<TagPillProps> = ({
  tag,
  tagColorMap = {},
  onRemove,
  size = 'md',
}) => {
  const col = resolveTagColor(tag, tagColorMap);
  const fontSize = size === 'sm' ? 10 : 11;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        borderRadius: 999,
        padding: '2px 8px',
        fontSize,
        fontWeight: 500,
        fontFamily: 'var(--eui-font-family)',
        whiteSpace: 'nowrap',
        background: col.bg,
        color: col.fg,
      }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={() => onRemove(tag)}
          aria-label={`Remove tag ${tag}`}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'inherit',
            padding: 0,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
        >
          ✕
        </button>
      )}
    </span>
  );
};
