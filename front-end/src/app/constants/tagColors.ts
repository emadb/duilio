export interface TagColor {
  key: string
  label: string
  bg: string       // Tailwind bg class for badge background
  text: string     // Tailwind text class for badge text
  swatch: string   // Tailwind bg class for the colour swatch tile
}

export const TAG_COLORS: TagColor[] = [
  { key: 'orchid',  label: 'Orchid',  bg: 'bg-[#e8ddf0]', text: 'text-[#6b5280]', swatch: 'bg-[#CDB4DB]' },
  { key: 'petal',   label: 'Petal',   bg: 'bg-[#fde4ed]', text: 'text-[#8a5070]', swatch: 'bg-[#FFC8DD]' },
  { key: 'blush',   label: 'Blush',   bg: 'bg-[#fdd5df]', text: 'text-[#9e4a68]', swatch: 'bg-[#FFAFCC]' },
  { key: 'icy',     label: 'Icy',     bg: 'bg-[#dce9f7]', text: 'text-[#3a6a9e]', swatch: 'bg-[#BDE0FE]' },
  { key: 'sky',     label: 'Sky',     bg: 'bg-[#d4e8fc]', text: 'text-[#2e5f8a]', swatch: 'bg-[#A2D2FF]' },
  { key: 'lavender',label: 'Lavender',bg: 'bg-[#e0d6ea]', text: 'text-[#5e4d72]', swatch: 'bg-[#b89ec4]' },
  { key: 'peach',   label: 'Peach',   bg: 'bg-[#fde3d7]', text: 'text-[#8a5a40]', swatch: 'bg-[#f4b89a]' },
  { key: 'mint',    label: 'Mint',    bg: 'bg-[#d6f0e4]', text: 'text-[#3a7a5e]', swatch: 'bg-[#a4dac0]' },
  { key: 'lilac',   label: 'Lilac',   bg: 'bg-[#ddd4e8]', text: 'text-[#5a4d6e]', swatch: 'bg-[#c0b3d4]' },
]

export function getTagColor(key: string): TagColor {
  return TAG_COLORS.find(c => c.key === key) ?? TAG_COLORS[TAG_COLORS.length - 1]
}
