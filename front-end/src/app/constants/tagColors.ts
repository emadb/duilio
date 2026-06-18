export interface TagColor {
  key: string
  label: string
  bg: string       // Tailwind bg class for badge background
  text: string     // Tailwind text class for badge text
  swatch: string   // Tailwind bg class for the colour swatch dot
}

// 8 distinct muted hues that complement the green/teal brand palette.
// Colors are defined as CSS variables in theme.css under "Tag colour palette".
export const TAG_COLORS: TagColor[] = [
  { key: 'sage',     label: 'Sage',     bg: 'bg-[var(--tag-sage-light)]',     text: 'text-[var(--tag-sage-dark)]',     swatch: 'bg-[var(--tag-sage)]'     },
  { key: 'clay',     label: 'Clay',     bg: 'bg-[var(--tag-clay-light)]',     text: 'text-[var(--tag-clay-dark)]',     swatch: 'bg-[var(--tag-clay)]'     },
  { key: 'sand',     label: 'Sand',     bg: 'bg-[var(--tag-sand-light)]',     text: 'text-[var(--tag-sand-dark)]',     swatch: 'bg-[var(--tag-sand)]'     },
  { key: 'lavender', label: 'Lavender', bg: 'bg-[var(--tag-lavender-light)]', text: 'text-[var(--tag-lavender-dark)]', swatch: 'bg-[var(--tag-lavender)]' },
  { key: 'peach',    label: 'Peach',    bg: 'bg-[var(--tag-peach-light)]',    text: 'text-[var(--tag-peach-dark)]',    swatch: 'bg-[var(--tag-peach)]'    },
  { key: 'slate',    label: 'Slate',    bg: 'bg-[var(--tag-slate-light)]',    text: 'text-[var(--tag-slate-dark)]',    swatch: 'bg-[var(--tag-slate)]'    },
  { key: 'amber',    label: 'Amber',    bg: 'bg-[var(--tag-amber-light)]',    text: 'text-[var(--tag-amber-dark)]',    swatch: 'bg-[var(--tag-amber)]'    },
  { key: 'rose',     label: 'Rose',     bg: 'bg-[var(--tag-rose-light)]',     text: 'text-[var(--tag-rose-dark)]',     swatch: 'bg-[var(--tag-rose)]'     },
]

export function getTagColor(key: string): TagColor {
  return TAG_COLORS.find(c => c.key === key) ?? TAG_COLORS[0]
}
