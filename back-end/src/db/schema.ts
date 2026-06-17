import { sql } from 'drizzle-orm'
import { check, pgTable, text, timestamp, uuid, primaryKey, unique, foreignKey } from 'drizzle-orm/pg-core'

export const TODO_STATUSES = ['todo', 'in-progress', 'done'] as const
export type TodoStatus = (typeof TODO_STATUSES)[number]

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
)

export type UserRow = typeof users.$inferSelect

export const todos = pgTable(
  'todos',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    dueDate: timestamp('due_date', { withTimezone: true }),
    status: text('status').$type<TodoStatus>().notNull().default('todo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('todos_status_check', sql`${table.status} in ('todo', 'in-progress', 'done')`),
  ],
)

export type TodoRow = typeof todos.$inferSelect

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('tags_user_id_name_unique').on(table.userId, table.name),
  ],
)

export type TagRow = typeof tags.$inferSelect

export const todoTags = pgTable(
  'todo_tags',
  {
    todoId: uuid('todo_id')
      .notNull()
      .references(() => todos.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.todoId, table.tagId] }),
  ],
)

export type TodoTagRow = typeof todoTags.$inferSelect
