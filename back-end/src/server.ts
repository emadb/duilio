import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { pool } from './db/client.js'
import { todoRoutes } from './routes/todos.js'
import { authRoutes } from './routes/auth.js'
import { tagRoutes } from './routes/tags.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIST = path.resolve(__dirname, '../../front-end/dist')
const { port: PORT, jwtSecret: JWT_SECRET } = config

const app = Fastify({ logger: true })

// Rate limiting — disabled globally, enabled per-route where needed
await app.register(rateLimit, { global: false })

// Authentication middleware
app.addHook('onRequest', async (request, reply) => {
  // If it's not an API request, don't check for auth (let static/fallback handle it)
  if (!request.url.startsWith('/api/')) {
    return
  }

  // If it IS an API request, but it's the auth routes, allow it
  if (request.url.startsWith('/api/auth')) {
    return
  }

  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    request.user = decoded
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
  }
})

// Extend Request type for TypeScript (we'll do this more properly with Fastify module augmentation if needed)
// For now, we'll use a cast in the routes.

await app.register(authRoutes)
await app.register(todoRoutes)
await app.register(tagRoutes)

if (existsSync(FRONTEND_DIST)) {
  await app.register(fastifyStatic, { root: FRONTEND_DIST })

  // SPA fallback: any non-API GET that misses a static file gets index.html
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html')
    }
    return reply.code(404).send({ error: 'Not Found', message: `Route ${request.method} ${request.url} not found` })
  })
} else {
  app.log.warn(`Front-end build not found at ${FRONTEND_DIST} — serving API only`)
}

app.addHook('onClose', async () => {
  await pool.end()
})

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
