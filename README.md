# Duilio

A full-stack personal task manager: React (Vite + Tailwind + shadcn) front-end, Fastify + Drizzle ORM back-end, PostgreSQL storage.

## Project structure

```
duilio/
  package.json        # workspace root — all scripts live here
  back-end/           # Fastify API server (TypeScript, Drizzle ORM)
    src/
    drizzle/          # SQL migrations
    drizzle.config.ts
    tsconfig.json
    .env              # local environment variables (not committed)
  front-end/          # React SPA (Vite, Tailwind, shadcn components)
    src/
    index.html
    vite.config.ts
  docs/               # Design documents and PRDs
```

## Prerequisites

- **Node.js** ≥ 20
- **Docker** (for PostgreSQL)

## Getting started

### 1. Install dependencies

```sh
npm install
```

### 2. Start PostgreSQL

```sh
docker compose up -d
```

This starts a PostgreSQL 17 instance on `localhost:5432` with:
- user: `postgres`
- password: `postgres`
- database: `duilio`

### 3. Configure environment

`back-end/.env` is pre-configured for the Docker setup above:

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:5432/duilio
PORT=3000
```

Edit it if your database credentials differ.

### 4. Apply database migrations

```sh
npm run migrate
```

### 5. Build and run

**Development** (hot reload for both front-end and back-end):

```sh
npm run dev
```

This starts two processes concurrently:
- Back-end at `http://localhost:3000` (tsx watch)
- Front-end Vite dev server at `http://localhost:5173` (proxies `/api` → port 3000)

Open `http://localhost:5173` in your browser.

**Production**:

```sh
npm run build      # compiles front-end (Vite) then back-end (tsc)
npm run start      # serves everything from http://localhost:3000
```

In production mode the back-end serves both the API and the built front-end from `http://localhost:3000`.

## All npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Start back-end + front-end dev servers concurrently |
| `npm run build` | Build front-end (Vite) then compile back-end (tsc) |
| `npm run start` | Start the compiled back-end (production) |
| `npm run migrate` | Apply pending database migrations |
| `npm run generate` | Generate a new migration from schema changes |

## API reference

All endpoints require a `Bearer` JWT token in the `Authorization` header except the auth routes.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user `{ email, password }` |
| `POST` | `/api/auth/login` | Login and receive a JWT `{ email, password }` |

### Todos

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/todos` | List all todos (with tags) |
| `POST` | `/api/todos` | Create a todo `{ title, description?, dueDate?, status?, tagIds? }` |
| `PATCH` | `/api/todos/:id` | Update a todo (any subset of fields + `tagIds?`) |
| `PATCH` | `/api/todos/:id/status` | Update only the status |
| `DELETE` | `/api/todos/:id` | Delete a todo |

### Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tags` | List all tags for the current user |
| `POST` | `/api/tags` | Create a tag `{ name, color }` — returns `409` if name already exists |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/duilio` | PostgreSQL connection string |
| `PORT` | `3000` | Port the back-end server listens on |
| `JWT_SECRET` | `super-secret-key` | Secret used to sign JWTs — **change in production** |
