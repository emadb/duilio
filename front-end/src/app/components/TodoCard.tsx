import * as React from "react"
import { Calendar, CheckCircle2, Circle, Clock } from "lucide-react"
import { format } from "date-fns"
import { Todo } from "../types"
import { Badge } from "./ui/badge"

interface TodoCardProps {
  todo: Todo
  onClick: (todo: Todo) => void
}

export function TodoCard({ todo, onClick }: TodoCardProps) {
  const statusConfig = {
    'todo': { label: 'To Do', icon: Circle, color: 'text-zinc-500', bg: 'bg-zinc-100' },
    'in-progress': { label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    'done': { label: 'Done', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  }

  const config = statusConfig[todo.status]
  const StatusIcon = config.icon

  return (
    <div 
      onClick={() => onClick(todo)}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card text-card-foreground p-4 shadow-sm transition-all hover:border-ring hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium line-clamp-1">{todo.title}</h3>
        <Badge variant="secondary" className={`shrink-0 ${config.bg} ${config.color} border-transparent`}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {todo.dueDate && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(todo.dueDate), "MMM d, yyyy")}</span>
        </div>
      )}
    </div>
  )
}
