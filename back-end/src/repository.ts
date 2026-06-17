import { desc, eq, sql, and, inArray } from 'drizzle-orm'
import { db } from './db/client.js'
import { todos, users, tags, todoTags, type TodoRow, type TodoStatus, type UserRow, type TagRow } from './db/schema.js'

export interface UserDto {
  id: string
  email: string
  createdAt: string
}

export interface CreateUserInput {
  email: string
  passwordHash: string
}

export interface TagDto {
  id: string
  name: string
  color: string
}

export interface TodoDto {
  id: string
  title: string
  description: string
  dueDate: string | null
  status: TodoStatus
  tags: TagDto[]
}

export interface CreateTagInput {
  userId: string
  name: string
  color: string
}

export interface CreateTodoInput {
  userId: string
  title: string
  description?: string
  dueDate?: string | null
  status?: TodoStatus
  tagIds?: string[]
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  dueDate?: string | null
  status?: TodoStatus
  tagIds?: string[]
}

function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  }
}

function toTagDto(row: TagRow): TagDto {
  return { id: row.id, name: row.name, color: row.color }
}

function toTodoDto(row: TodoRow, tagRows: TagRow[] = []): TodoDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    status: row.status,
    tags: tagRows.map(toTagDto),
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

// Tag Repository functions
export async function listTagsByUser(userId: string): Promise<TagDto[]> {
  const rows = await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(tags.name)
  return rows.map(toTagDto)
}

export async function createTag(input: CreateTagInput): Promise<TagDto | null> {
  const existing = await db.select().from(tags)
    .where(and(eq(tags.userId, input.userId), eq(tags.name, input.name)))
    .limit(1)
  if (existing.length > 0) return null // duplicate

  const [row] = await db.insert(tags).values(input).returning()
  return toTagDto(row)
}

// Todo Repository functions
async function getTagsForTodos(todoIds: string[]): Promise<Map<string, TagRow[]>> {
  if (todoIds.length === 0) return new Map()
  const rows = await db
    .select({ todoId: todoTags.todoId, tag: tags })
    .from(todoTags)
    .innerJoin(tags, eq(todoTags.tagId, tags.id))
    .where(inArray(todoTags.todoId, todoIds))

  const map = new Map<string, TagRow[]>()
  for (const { todoId, tag } of rows) {
    if (!map.has(todoId)) map.set(todoId, [])
    map.get(todoId)!.push(tag)
  }
  return map
}

async function syncTodoTags(todoId: string, userId: string, tagIds: string[]): Promise<void> {
  // Filter to only tags that belong to this user
  const validTags = tagIds.length > 0
    ? await db.select().from(tags).where(and(inArray(tags.id, tagIds), eq(tags.userId, userId)))
    : []
  const validIds = validTags.map(t => t.id)

  await db.delete(todoTags).where(eq(todoTags.todoId, todoId))
  if (validIds.length > 0) {
    await db.insert(todoTags).values(validIds.map(tagId => ({ todoId, tagId })))
  }
}

export async function listTodosByUser(userId: string): Promise<TodoDto[]> {
  const rows = await db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt))
  const tagsMap = await getTagsForTodos(rows.map(r => r.id))
  return rows.map(row => toTodoDto(row, tagsMap.get(row.id) ?? []))
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

  if (input.tagIds && input.tagIds.length > 0) {
    await syncTodoTags(row.id, input.userId, input.tagIds)
  }

  const tagsMap = await getTagsForTodos([row.id])
  return toTodoDto(row, tagsMap.get(row.id) ?? [])
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
  if (!row) return null

  if (input.tagIds !== undefined) {
    await syncTodoTags(id, userId, input.tagIds)
  }

  const tagsMap = await getTagsForTodos([id])
  return toTodoDto(row, tagsMap.get(id) ?? [])
}

export async function deleteTodo(id: string, userId: string): Promise<boolean> {
  const rows = await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId))).returning({ id: todos.id })
  return rows.length > 0
}
