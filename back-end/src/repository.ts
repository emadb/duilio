import { desc, eq, sql, and } from 'drizzle-orm'
import { db } from './db/client.js'
import { todos, users, type TodoRow, type TodoStatus, type UserRow } from './db/schema.js'

export interface UserDto {
  id: string
  email: string
  createdAt: string
}

export interface CreateUserInput {
  email: string
  passwordHash: string
}

export interface TodoDto {
  id: string
  title: string
  description: string
  dueDate: string | null
  status: TodoStatus
}

export interface CreateTodoInput {
  userId: string
  title: string
  description?: string
  dueDate?: string | null
  status?: TodoStatus
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  dueDate?: string | null
  status?: TodoStatus
}

function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  }
}

function toTodoDto(row: TodoRow): TodoDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    status: row.status,
  }
}

// User Repository functions
export async function createUser(input: CreateUserInput): Promise<UserDto> {
  const [row] = await db
    .insert(users)
    .values(input)
    .returning()
  return toUserDto(row)
}

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return row
}

// Todo Repository functions
export async function listTodosByUser(userId: string): Promise<TodoDto[]> {
  const rows = await db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt))
  return rows.map(toTodoDto)
}

export async function createTodo(input: CreateTodoInput): Promise<TodoDto> {
  const [row] = await db
    .insert(todos)
    .values({
      userId: input.userId,
      title: input.title,
      description: input.description ?? '',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: input.status ?? 'todo',
    })
    .returning()
  return toTodoDto(row)
}

export async function updateTodo(id: string, userId: string, input: UpdateTodoInput): Promise<TodoDto | null> {
  const values: Partial<typeof todos.$inferInsert> = { updatedAt: sql`now()` as unknown as Date }
  if (input.title !== undefined) values.title = input.title
  if (input.description !== undefined) values.description = input.description
  if (input.dueDate !== undefined) values.dueDate = input.dueDate ? new Date(input.dueDate) : null
  if (input.status !== undefined) values.status = input.status

  const [row] = await db
    .update(todos)
    .set(values)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning()
  return row ? toTodoDto(row) : null
}

export async function deleteTodo(id: string, userId: string): Promise<boolean> {
  const rows = await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId))).returning({ id: todos.id })
  return rows.length > 0
}
