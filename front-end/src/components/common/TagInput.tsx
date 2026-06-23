import React, { useState, useRef } from 'react';
import { TAG_COLORS, PRESET_TAGS } from '../../constants';
import { autoColorIndex, slugifyTag, resolveTagColor } from '../../utils/helpers';
import { TagPill } from './TagPill';
import type { TagColorMap } from '../../types/task';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  tagColorMap: TagColorMap;
  onColorAssign: (tag: string, colorIndex: number) => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  tagColorMap,
  onColorAssign,
}) => {
  const [val, setVal] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingColor, setPendingColor] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const slug = slugifyTag(val);

  const suggestions = (
    val.trim()
      ? PRESET_TAGS.filter((p) => p.includes(val.toLowerCase()) && !tags.includes(p))
      : PRESET_TAGS.filter((p) => !tags.includes(p))
  ).slice(0, 6);

  const showPicker = open && val.trim().length > 0 && tagColorMap[slug] === undefined;

  function addTag(tag: string, forceColor?: number) {
    const t = slugifyTag(tag);
    if (!t || tags.includes(t)) { setVal(''); return; }
    const ci = forceColor !== undefined
      ? forceColor
      : (pendingColor !== null ? pendingColor : (tagColorMap[t] ?? autoColorIndex(t)));
    if (tagColorMap[t] === undefined) onColorAssign(t, ci);
    onChange([...tags, t]);
    setVal('');
    setPendingColor(null);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(tags.filter((x) => x !== tag));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
      e.preventDefault();
      addTag(val);
    }
    if (e.key === 'Backspace' && !val && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Tag wrap */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '6px 10px',
          border: '1px solid var(--eui-form-border-color)',
          borderRadius: 'var(--eui-border-radius-medium)',
          background: 'var(--eui-form-background)',
          minHeight: 40,
          alignItems: 'center',
          cursor: 'text',
        }}
      >
        {tags.map((tag) => (
          <TagPill key={tag} tag={tag} tagColorMap={tagColorMap} onRemove={removeTag} />
        ))}
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => { setVal(e.target.value); setPendingColor(null); }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={tags.length ? '' : 'Add tags…'}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--eui-font-family)',
            fontSize: 14,
            color: 'var(--eui-text-color)',
            flex: 1,
            minWidth: 100,
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (suggestions.length > 0 || showPicker) && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--eui-bg-plain)',
            border: '1px solid var(--eui-border-color)',
            borderRadius: 'var(--eui-border-radius-medium)',
            boxShadow: 'var(--eui-shadow-s)',
            zIndex: 20,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((p) => {
            const col = resolveTagColor(p, tagColorMap);
            return (
              <div
                key={p}
                onMouseDown={() => addTag(p, tagColorMap[p] ?? autoColorIndex(p))}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--eui-text-color)',
                  fontFamily: 'var(--eui-font-family)',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    'var(--eui-bg-interactive-hover)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = 'transparent')
                }
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: col.dot,
                    flexShrink: 0,
                  }}
                />
                {p}
              </div>
            );
          })}

          {/* Color picker for new tags */}
          {showPicker && (
            <div
              style={{
                padding: '8px 12px',
                borderTop: suggestions.length ? '1px solid var(--eui-border-color)' : 'none',
              }}
            >
              <p
                style={{
                  margin: '0 0 7px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--eui-text-subdued)',
                  fontFamily: 'var(--eui-font-family)',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}
              >
                Tag color
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TAG_COLORS.map((col, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); setPendingColor(i); }}
                    aria-label={`Color ${i + 1}`}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: col.dot,
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                      outline:
                        pendingColor === i ? `3px solid ${col.dot}` : '2px solid transparent',
                      outlineOffset: pendingColor === i ? 2 : 0,
                      transform: pendingColor === i ? 'scale(1.18)' : 'scale(1)',
                      transition: 'transform 0.12s ease, outline 0.12s ease',
                    }}
                  />
                ))}
              </div>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 11,
                  color: 'var(--eui-text-subdued)',
                  fontFamily: 'var(--eui-font-family)',
                }}
              >
                {pendingColor !== null
                  ? 'Press Enter to add with this color'
                  : 'Pick a color, then press Enter'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
