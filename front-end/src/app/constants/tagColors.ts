export interface TagColor {
  key: string
  label: string
  bg: string       // Tailwind bg class for badge background
  text: string     // Tailwind text class for badge text
  swatch: string   // Tailwind bg class for the colour swatch tile
}

// Tag colours reference the palette CSS variables defined in theme.css.
// To change a tag colour, update the corresponding --c-* variable there.
export const TAG_COLORS: TagColor[] = [
  // Jungle Teal family
  { key: 'jungle',  label: 'Jungle',  bg: 'bg-[var(--c-jungle-light)]',  text: 'text-[var(--c-jungle-dark)]',  swatch: 'bg-[var(--c-jungle)]' },
  { key: 'forest',  label: 'Forest',  bg: 'bg-[var(--c-frozen-light)]',  text: 'text-[var(--c-frozen-dark)]',  swatch: 'bg-[var(--c-jungle)]' },
  // Muted Teal family
  { key: 'sage',    label: 'Sage',    bg: 'bg-[var(--c-teal-light)]',    text: 'text-[var(--c-teal-dark)]',    swatch: 'bg-[var(--c-teal)]' },
  { key: 'fern',    label: 'Fern',    bg: 'bg-[var(--c-frozen-light)]',  text: 'text-[var(--c-teal-dark)]',    swatch: 'bg-[var(--c-teal)]' },
  // Frozen Water family
  { key: 'frost',   label: 'Frost',   bg: 'bg-[var(--c-frozen-light)]',  text: 'text-[var(--c-frozen-dark)]',  swatch: 'bg-[var(--c-frozen)]' },
  { key: 'glacier', label: 'Glacier', bg: 'bg-[var(--c-azure-light)]',   text: 'text-[var(--c-azure-dark)]',   swatch: 'bg-[var(--c-frozen)]' },
  // Azure Mist family
  { key: 'mist',    label: 'Mist',    bg: 'bg-[var(--c-azure-light)]',   text: 'text-[var(--c-azure-dark)]',   swatch: 'bg-[var(--c-azure)]' },
  { key: 'sky',     label: 'Sky',     bg: 'bg-[var(--c-azure)]',         text: 'text-[var(--c-azure-dark)]',   swatch: 'bg-[var(--c-teal)]' },
  // Mint Cream family
  { key: 'mint',    label: 'Mint',    bg: 'bg-[var(--c-mint-light)]',    text: 'text-[var(--c-mint-dark)]',    swatch: 'bg-[var(--c-mint)]' },
]

export function getTagColor(key: string): TagColor {
  return TAG_COLORS.find(c => c.key === key) ?? TAG_COLORS[TAG_COLORS.length - 1]
}
