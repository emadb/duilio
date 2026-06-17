# Full-stack Todo App — Design

**Date:** 2026-06-11
**Status:** Approved (tests explicitly skipped per user request)

## Goal

Turn the existing React front-end (`front-end/`) into a full-stack, single-user todo
application backed by PostgreSQL, with a TypeScript API for: list, add, modify,
delete, and complete (change state) of todos.

## Decisions

- **Backend framework:** Fastify (v5) with JSON-schema validation.
- **Data layer:** Drizzle ORM + node-postgres, migrations via drizzle-kit.
- **Database:** PostgreSQL via Docker Compose (`docker-compose.yml` at repo root).
- **Topology:** single server — the backend serves the built React app and the API
  from the same origin (`http://localhost:3000`). A Vite dev proxy for `/api` keeps
  the fast dev loop working.
- **Tests:** skipped per user request.

## Data model

Table `todos`:

| column      | type        | notes                                              |
|-------------|-------------|----------------------------------------------------|
| id          | uuid PK     | `gen_random_uuid()`                                |
| title       | text        | not null                                           |
| description | text        | not null, default `''`                             |
| due_date    | timestamptz | nullable                                           |
| status      | text        | not null, check in (`todo`,`in-progress`,`done`), default `todo` |
| created_at  | timestamptz | not null, default now()                            |
| updated_at  | timestamptz | not null, default now(), set on update             |

API shape matches the front-end `Todo` type exactly:
`{ id, title, description, dueDate: string | null, status }`.

## API

| Method | Path                    | Purpose                          | Errors |
|--------|-------------------------|----------------------------------|--------|
| GET    | /api/todos              | list all, newest first           |        |
| POST   | /api/todos              | create (title required)          | 400    |
| PATCH  | /api/todos/:id          | partial update of any field      | 400, 404 |
| PATCH  | /api/todos/:id/status   | change state / complete          | 400, 404 |
| DELETE | /api/todos/:id          | delete                           | 404    |

Validation is automatic via Fastify route schemas; errors return structured JSON.

## Front-end changes (minimal)

- New `src/lib/api.ts` HTTP client.
- `App.tsx`: load todos from the API on mount (loading state), call the API in
  save/delete handlers, error feedback via sonner toasts.
- Mount sonner `<Toaster>` in `main.tsx`.
- Vite dev proxy: `/api` → `http://localhost:3000`.

## Run story

```sh
docker compose up -d          # postgres
cd back-end && npm run migrate
cd front-end && npm run build
cd back-end && npm run dev    # http://localhost:3000
```
