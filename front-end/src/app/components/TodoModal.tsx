import * as React from "react"
import { format } from "date-fns"
import { Tag, Todo, TodoStatus } from "../types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { TagCombobox } from "./TagCombobox"

interface TodoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (todo: Omit<Todo, 'id'> | Todo) => void
  onDelete?: (id: string) => void
  initialData?: Todo | null
  allTags: Tag[]
  onCreateTag: (name: string, color: string) => Promise<Tag>
}

export function TodoModal({ isOpen, onClose, onSave, onDelete, initialData, allTags, onCreateTag }: TodoModalProps) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  const [status, setStatus] = React.useState<TodoStatus>("todo")
  const [selectedTags, setSelectedTags] = React.useState<Tag[]>([])

  React.useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setDueDate(initialData.dueDate ? format(new Date(initialData.dueDate), 'yyyy-MM-dd') : "")
      setStatus(initialData.status)
      setSelectedTags(initialData.tags ?? [])
    } else if (isOpen && !initialData) {
      setTitle("")
      setDescription("")
      setDueDate("")
      setStatus("todo")
      setSelectedTags([])
    }
  }, [initialData, isOpen])

  const handleSave = () => {
    if (!title.trim()) return

    const data = {
      title,
      description,
      dueDate: dueDate || null,
      status,
      tags: selectedTags,
      tagIds: selectedTags.map(t => t.id),
    }

    if (initialData) {
      onSave({ ...data, id: initialData.id })
    } else {
      onSave(data)
    }
    onClose()
  }

  const isEditing = !!initialData

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TodoStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Tags</Label>
            <TagCombobox
              allTags={allTags}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              onCreateTag={onCreateTag}
            />
          </div>
        </div>
        <DialogFooter className="flex items-center sm:justify-between">
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete(initialData.id)
                onClose()
              }}
            >
              Delete
            </Button>
          ) : (
            <div></div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              Save Task
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
