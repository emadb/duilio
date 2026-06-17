import type { FastifyInstance } from 'fastify'
import { TODO_STATUSES, type TodoStatus } from '../db/schema.js'
import { createTodo, deleteTodo, listTodosByUser, updateTodo } from '../repository.js'

const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

const tagShape = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    color: { type: 'string' },
  },
  required: ['id', 'name', 'color'],
} as const

const todoProperties = {
  id: { type: 'string' },
  title: { type: 'string' },
  description: { type: 'string' },
  dueDate: { type: ['string', 'null'] },
  status: { type: 'string', enum: [...TODO_STATUSES] },
  tags: { type: 'array', items: tagShape },
} as const

const todoResponse = {
  type: 'object',
  properties: todoProperties,
  required: ['id', 'title', 'description', 'dueDate', 'status', 'tags'],
} as const

const idParams = {
  type: 'object',
  properties: { id: { type: 'string', pattern: UUID_PATTERN } },
  required: ['id'],
} as const

interface TodoBody {
  title?: string
  description?: string
  dueDate?: string | null
  status?: TodoStatus
  tagIds?: string[]
}

function isInvalidDate(dueDate: string | null | undefined): boolean {
  return typeof dueDate === 'string' && Number.isNaN(Date.parse(dueDate))
}

export async function todoRoutes(app: FastifyInstance) {
  app.get('/api/todos', {
    schema: {
      response: { 200: { type: 'array', items: todoResponse } },
    },
  }, async (request) => listTodosByUser(request.user!.userId))

  app.post<{ Body: TodoBody & { title: string } }>('/api/todos', {
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          dueDate: { type: ['string', 'null'] },
          status: { type: 'string', enum: [...TODO_STATUSES] },
          tagIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['title'],
        additionalProperties: false,
      },
      response: { 201: todoResponse },
    },
  }, async (request, reply) => {
    if (isInvalidDate(request.body.dueDate)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'dueDate is not a valid date' })
    }
    const todo = await createTodo({
      ...request.body,
      userId: request.user!.userId,
    })
    return reply.code(201).send(todo)
  })

  app.patch<{ Params: { id: string }; Body: TodoBody }>('/api/todos/:id', {
    schema: {
      params: idParams,
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          dueDate: { type: ['string', 'null'] },
          status: { type: 'string', enum: [...TODO_STATUSES] },
          tagIds: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
      response: { 200: todoResponse },
    },
  }, async (request, reply) => {
    if (isInvalidDate(request.body.dueDate)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'dueDate is not a valid date' })
    }
    const todo = await updateTodo(request.params.id, request.user!.userId, request.body)
    if (!todo) {
      return reply.code(404).send({ error: 'Not Found', message: `Todo ${request.params.id} not found` })
    }
    return todo
  })

  app.patch<{ Params: { id: string }; Body: { status: TodoStatus } }>('/api/todos/:id/status', {
    schema: {
      params: idParams,
      body: {
        type: 'object',
        properties: { status: { type: 'string', enum: [...TODO_STATUSES] } },
        required: ['status'],
        additionalProperties: false,
      },
      response: { 200: todoResponse },
    },
  }, async (request, reply) => {
    const todo = await updateTodo(request.params.id, request.user!.userId, { status: request.body.status })
    if (!todo) {
      return reply.code(404).send({ error: 'Not Found', message: `Todo ${request.params.id} not found` })
    }
    return todo
  })

  app.delete<{ Params: { id: string } }>('/api/todos/:id', {
    schema: { params: idParams },
  }, async (request, reply) => {
    const deleted = await deleteTodo(request.params.id, request.user!.userId)
    if (!deleted) {
      return reply.code(404).send({ error: 'Not Found', message: `Todo ${request.params.id} not found` })
    }
    return reply.code(204).send()
  })
}
