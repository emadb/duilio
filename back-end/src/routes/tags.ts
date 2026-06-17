import type { FastifyInstance } from 'fastify'
import { createTag, listTagsByUser } from '../repository.js'

const tagResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    color: { type: 'string' },
  },
  required: ['id', 'name', 'color'],
} as const

export async function tagRoutes(app: FastifyInstance) {
  app.get('/api/tags', {
    schema: {
      response: { 200: { type: 'array', items: tagResponse } },
    },
  }, async (request) => listTagsByUser(request.user!.userId))

  app.post<{ Body: { name: string; color: string } }>('/api/tags', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 },
        },
        required: ['name', 'color'],
        additionalProperties: false,
      },
      response: { 201: tagResponse },
    },
  }, async (request, reply) => {
    const tag = await createTag({ userId: request.user!.userId, ...request.body })
    if (!tag) {
      return reply.code(409).send({ error: 'Conflict', message: `Tag "${request.body.name}" already exists` })
    }
    return reply.code(201).send(tag)
  })
}
