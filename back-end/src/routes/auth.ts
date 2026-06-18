import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { createUser, getUserByEmail } from '../repository.js'

const JWT_SECRET = config.jwtSecret

const registerSchema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
    required: ['email', 'password'],
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        createdAt: { type: 'string' },
      },
      required: ['id', 'email', 'createdAt'],
    },
  },
}

const loginSchema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
    required: ['email', 'password'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['id', 'email'],
        },
      },
      required: ['token', 'user'],
    },
  },
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', {
    schema: registerSchema,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { email, password } = request.body as any
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return reply.code(400 as any).send({ error: 'Bad Request', message: 'User already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await createUser({ email, passwordHash })
    return reply.code(201).send(user)
  })

  app.post('/api/auth/login', {
    schema: loginSchema,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { email, password } = request.body as any
    const user = await getUserByEmail(email)
    if (!user) {
      return reply.code(401 as any).send({ error: 'Unauthorized', message: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return reply.code(401 as any).send({ error: 'Unauthorized', message: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    return {
      token,
      user: { id: user.id, email: user.email },
    }
  })
}
