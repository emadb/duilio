import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { Tag } from "../types"
import { TAG_COLORS, getTagColor } from "../constants/tagColors"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { Badge } from "./ui/badge"

interface TagComboboxProps {
  allTags: Tag[]
  selectedTags: Tag[]
  onChange: (tags: Tag[]) => void
  onCreateTag: (name: string, color: string) => Promise<Tag>
}

export function TagCombobox({ allTags, selectedTags, onChange, onCreateTag }: TagComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [newTagColor, setNewTagColor] = React.useState(TAG_COLORS[0].key)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const selectedIds = new Set(selectedTags.map(t => t.id))

  const filtered = allTags.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  )

  const exactMatch = allTags.some(t => t.name.toLowerCase() === query.toLowerCase())
  const showCreate = query.trim().length > 0 && !exactMatch

  function toggleTag(tag: Tag) {
    if (selectedIds.has(tag.id)) {
      onChange(selectedTags.filter(t => t.id !== tag.id))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  function removeTag(id: string) {
    onChange(selectedTags.filter(t => t.id !== id))
  }

  async function handleCreate() {
    if (!query.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const newTag = await onCreateTag(query.trim(), newTagColor)
      onChange([...selectedTags, newTag])
      setQuery("")
      setNewTagColor(TAG_COLORS[0].key)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery("")
      setNewTagColor(TAG_COLORS[0].key)
    }
  }

  const selectedColor = TAG_COLORS.find(c => c.key === newTagColor)!

  return (
    <div className="flex flex-col gap-2">
      {/* Selected tag pills */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map(tag => {
            const c = getTagColor(tag.color)
            return (
              <Badge
                key={tag.id}
                className={`${c.bg} ${c.text} border-transparent gap-1 pr-1`}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="rounded-full hover:opacity-70 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            Add tags…
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="Search or create tag…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="mb-2 h-8 text-sm"
            autoFocus
          />

          {/* Existing tags list */}
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filtered.map(tag => {
              const c = getTagColor(tag.color)
              const selected = selectedIds.has(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.swatch}`} />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              )
            })}

            {filtered.length === 0 && !showCreate && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No tags found.</p>
            )}
          </div>

          {/* Inline create — appears as soon as the typed name has no exact match */}
          {showCreate && (
            <div className="mt-2 border-t pt-2 space-y-2">
              {/* Colour picker */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-muted-foreground shrink-0">Colour</span>
                <div className="flex gap-1.5 flex-wrap">
                  {TAG_COLORS.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      title={c.label}
                      onClick={() => setNewTagColor(c.key)}
                      className={`h-5 w-5 rounded-full shrink-0 transition-transform hover:scale-110 ${c.swatch} ${
                        newTagColor === c.key
                          ? 'ring-2 ring-offset-1 ring-foreground scale-110'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Create button — shows a preview of the badge */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground shrink-0">
                  {isSubmitting ? 'Creating…' : 'Create'}
                </span>
                <Badge className={`${selectedColor.bg} ${selectedColor.text} border-transparent text-xs`}>
                  {query}
                </Badge>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
