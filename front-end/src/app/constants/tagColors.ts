export interface TagColor {
  key: string
  label: string
  bg: string       // Tailwind bg class for badge background
  text: string     // Tailwind text class for badge text
  swatch: string   // Tailwind bg class for the colour swatch tile
}

export const TAG_COLORS: TagColor[] = [
  { key: 'red',    label: 'Red',    bg: 'bg-red-100',    text: 'text-red-700',    swatch: 'bg-red-400'    },
  { key: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', swatch: 'bg-orange-400' },
  { key: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', swatch: 'bg-yellow-400' },
  { key: 'green',  label: 'Green',  bg: 'bg-green-100',  text: 'text-green-700',  swatch: 'bg-green-400'  },
  { key: 'teal',   label: 'Teal',   bg: 'bg-teal-100',   text: 'text-teal-700',   swatch: 'bg-teal-400'   },
  { key: 'blue',   label: 'Blue',   bg: 'bg-blue-100',   text: 'text-blue-700',   swatch: 'bg-blue-400'   },
  { key: 'violet', label: 'Violet', bg: 'bg-violet-100', text: 'text-violet-700', swatch: 'bg-violet-400' },
  { key: 'pink',   label: 'Pink',   bg: 'bg-pink-100',   text: 'text-pink-700',   swatch: 'bg-pink-400'   },
  { key: 'gray',   label: 'Gray',   bg: 'bg-gray-100',   text: 'text-gray-700',   swatch: 'bg-gray-400'   },
]

export function getTagColor(key: string): TagColor {
  return TAG_COLORS.find(c => c.key === key) ?? TAG_COLORS[TAG_COLORS.length - 1]
}
