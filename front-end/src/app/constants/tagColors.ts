export interface TagColor {
  key: string
  label: string
  bg: string       // Tailwind bg class for badge background
  text: string     // Tailwind text class for badge text
  swatch: string   // Tailwind bg class for the colour swatch dot
}

// 8 vibrant colours, each with a light tint (badge bg) and dark shade (badge text).
// Swatch values, light tints and dark shades are CSS variables defined in theme.css.
export const TAG_COLORS: TagColor[] = [
  { key: 'coral',  label: 'Coral',  bg: 'bg-[var(--tag-coral-light)]',  text: 'text-[var(--tag-coral-dark)]',  swatch: 'bg-[var(--tag-coral)]'  },
  { key: 'peach',  label: 'Peach',  bg: 'bg-[var(--tag-peach-light)]',  text: 'text-[var(--tag-peach-dark)]',  swatch: 'bg-[var(--tag-peach)]'  },
  { key: 'lime',   label: 'Lime',   bg: 'bg-[var(--tag-lime-light)]',   text: 'text-[var(--tag-lime-dark)]',   swatch: 'bg-[var(--tag-lime)]'   },
  { key: 'navy',   label: 'Navy',   bg: 'bg-[var(--tag-navy-light)]',   text: 'text-[var(--tag-navy-dark)]',   swatch: 'bg-[var(--tag-navy)]'   },
  { key: 'steel',  label: 'Steel',  bg: 'bg-[var(--tag-steel-light)]',  text: 'text-[var(--tag-steel-dark)]',  swatch: 'bg-[var(--tag-steel)]'  },
  { key: 'forest', label: 'Forest', bg: 'bg-[var(--tag-forest-light)]', text: 'text-[var(--tag-forest-dark)]', swatch: 'bg-[var(--tag-forest)]' },
  { key: 'amber',  label: 'Amber',  bg: 'bg-[var(--tag-amber-light)]',  text: 'text-[var(--tag-amber-dark)]',  swatch: 'bg-[var(--tag-amber)]'  },
  { key: 'yellow', label: 'Yellow', bg: 'bg-[var(--tag-yellow-light)]', text: 'text-[var(--tag-yellow-dark)]', swatch: 'bg-[var(--tag-yellow)]' },
]

export function getTagColor(key: string): TagColor {
  return TAG_COLORS.find(c => c.key === key) ?? TAG_COLORS[0]
}
