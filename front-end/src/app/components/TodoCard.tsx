import * as React from "react"
import { Calendar } from "lucide-react"
import { format } from "date-fns"
import { Todo } from "../types"
import { Badge } from "./ui/badge"
import { getTagColor } from "../constants/tagColors"

interface TodoCardProps {
  todo: Todo
  onClick: (todo: Todo) => void
}

export function TodoCard({ todo, onClick }: TodoCardProps) {
  return (
    <div 
      onClick={() => onClick(todo)}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card text-card-foreground p-4 shadow-sm transition-all hover:border-ring hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium line-clamp-2">{todo.title}</h3>
      </div>

      {todo.dueDate && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(todo.dueDate), "MMM d, yyyy")}</span>
        </div>
      )}

      {todo.tags && todo.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {todo.tags.map(tag => {
            const c = getTagColor(tag.color)
            return (
              <Badge
                key={tag.id}
                variant="secondary"
                className={`${c.bg} ${c.text} border-transparent text-xs`}
              >
                {tag.name}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
