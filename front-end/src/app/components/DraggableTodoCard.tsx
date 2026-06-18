import * as React from "react"
import { useDrag } from "react-dnd"
import { Todo } from "../types"
import { TodoCard } from "./TodoCard"

export const DRAG_TYPE = "TODO_CARD"

export interface DragItem {
  id: string
  status: Todo["status"]
}

interface DraggableTodoCardProps {
  todo: Todo
  onClick: (todo: Todo) => void
}

export function DraggableTodoCard({ todo, onClick }: DraggableTodoCardProps) {
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: todo.id, status: todo.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      className="cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <TodoCard todo={todo} onClick={onClick} />
    </div>
  )
}
