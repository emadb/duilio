import * as React from "react"
import { Plus, ListTodo, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Todo, Tag, TodoStatus } from "./types"
import { api } from "../lib/api"
import { Button } from "./components/ui/button"
import { TodoCard } from "./components/TodoCard"
import { TodoModal } from "./components/TodoModal"
import { AuthModal } from "./components/AuthModal"

const STATUS_GROUPS: { value: TodoStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' }
]

export default function App() {
  const [todos, setTodos] = React.useState<Todo[]>([])
  const [tags, setTags] = React.useState<Tag[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [selectedTodo, setSelectedTodo] = React.useState<Todo | null>(null)
  const [filterStatus, setFilterStatus] = React.useState<TodoStatus | 'all'>('all')

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    setIsAuthModalOpen(false)
    Promise.all([api.listTodos(), api.listTags()])
      .then(([fetchedTodos, fetchedTags]) => {
        setTodos(fetchedTodos)
        setTags(fetchedTags)
      })
      .catch((err: Error) => toast.error(`Failed to load data: ${err.message}`))
      .finally(() => setIsLoading(false))
  }

  const handleLogout = () => {
    api.setAuthToken(null)
    setIsLoggedIn(false)
    setTodos([])
    setTags([])
  }

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      setIsLoggedIn(true)
      Promise.all([api.listTodos(), api.listTags()])
        .then(([fetchedTodos, fetchedTags]) => {
          setTodos(fetchedTodos)
          setTags(fetchedTags)
        })
        .catch((err: Error) => {
          if (err.message.includes('Unauthorized')) {
            handleLogout()
          } else {
            toast.error(`Failed to load data: ${err.message}`)
          }
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const handleCreateTodo = () => {
    setSelectedTodo(null)
    setIsModalOpen(true)
  }

  const handleEditTodo = (todo: Todo) => {
    setSelectedTodo(todo)
    setIsModalOpen(true)
  }

  const handleSaveTodo = async (todoData: Omit<Todo, 'id'> | Todo) => {
    try {
      if ('id' in todoData) {
        const { id, ...fields } = todoData
        const updated = await api.updateTodo(id, fields)
        setTodos(prev => prev.map(t => t.id === updated.id ? updated : t))
      } else {
        const created = await api.createTodo(todoData)
        setTodos(prev => [created, ...prev])
      }
    } catch (err) {
      toast.error(`Failed to save task: ${(err as Error).message}`)
    }
  }

  const handleCreateTag = async (name: string, color: string): Promise<Tag> => {
    const newTag = await api.createTag({ name, color })
    setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
    return newTag
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      await api.deleteTodo(id)
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      toast.error(`Failed to delete task: ${(err as Error).message}`)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6 font-sans">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <ListTodo className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Duilio</h1>
            <p className="text-muted-foreground">Please login to manage your tasks.</p>
          </div>
          <Button onClick={() => setIsAuthModalOpen(true)} size="lg" className="px-8">
            Get Started
          </Button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-12 font-sans text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Duilio</h1>
              <p className="text-sm text-muted-foreground"></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-muted rounded-lg border border-border">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {STATUS_GROUPS.map(group => (
                <button
                  key={group.value}
                  onClick={() => setFilterStatus(group.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterStatus === group.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
              <Button onClick={handleCreateTodo} className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>
        </header>

        {/* Task List (Grouped by Status) */}
        <main className="space-y-8">
          {isLoading && (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16">
              <p className="text-sm text-muted-foreground">Loading tasks…</p>
            </div>
          )}

          {!isLoading && STATUS_GROUPS.map(group => {
            if (filterStatus !== 'all' && filterStatus !== group.value) return null;

            const groupTodos = todos.filter(t => t.status === group.value)

            if (groupTodos.length === 0) return null

            return (
              <section key={group.value} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</h2>
                  <span className="flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium text-secondary-foreground">
                    {groupTodos.length}
                  </span>
                </div>

                <div className="grid gap-3">
                  {groupTodos.map(todo => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      onClick={handleEditTodo}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {isLoading ? null : todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <ListTodo className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No tasks yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">Create a task to get started.</p>
              <Button onClick={handleCreateTodo} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Task
              </Button>
            </div>
          ) : filterStatus !== 'all' && todos.filter(t => t.status === filterStatus).length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <ListTodo className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No tasks found</h3>
              <p className="mb-4 text-sm text-muted-foreground">No tasks match the selected filter.</p>
            </div>
          ) : null}
        </main>

      </div>

      <TodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTodo}
        onDelete={handleDeleteTodo}
        initialData={selectedTodo}
        allTags={tags}
        onCreateTag={handleCreateTag}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
