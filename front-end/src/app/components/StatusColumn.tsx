import * as React from "react"
import { useDrop } from "react-dnd"
import { TodoStatus } from "../types"
import { DRAG_TYPE, DragItem } from "./DraggableTodoCard"

interface StatusColumnProps {
  status: TodoStatus
  label: string
  count: number
  onDrop: (todoId: string, newStatus: TodoStatus) => void
  children: React.ReactNode
}

export function StatusColumn({ status, label, count, onDrop, children }: StatusColumnProps) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE,
    canDrop: (item) => item.status !== status,
    drop: (item) => {
      if (item.status !== status) {
        onDrop(item.id, status)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const isActive = isOver && canDrop

  return (
    <section
      ref={drop}
      className={`space-y-4 rounded-xl p-3 -m-3 transition-colors duration-150 ${
        isActive ? "bg-primary/10 ring-2 ring-primary/30" : canDrop ? "bg-muted/20" : ""
      }`}
    >
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </h2>
        <span className="flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium text-secondary-foreground">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="grid gap-3">
        {children}

        {/* Drop target placeholder — visible only while dragging over an empty column */}
        {canDrop && count === 0 && (
          <div
            className={`flex items-center justify-center rounded-lg border-2 border-dashed py-8 text-xs font-medium transition-colors duration-150 ${
              isActive
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            Drop here
          </div>
        )}
      </div>
    </section>
  )
}
