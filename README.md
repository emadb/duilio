# Duilio

A full-stack personal task manager: a React (Vite + Tailwind + shadcn) front-end and a
Rust (Axum + SQLx) API back-end, backed by PostgreSQL.

## Project structure

```
duilio/
  docker-compose.yml   # PostgreSQL service
  back-end/            # Rust API server (Axum + SQLx)
    src/
      main.rs          # entry point: builds the router, runs migrations
      auth_middleware.rs
      modules/         # feature modules: auth, todos, tags, health
    migrations/        # SQL migrations (applied automatically at startup)
    Cargo.toml
  front-end/           # React SPA (Vite, Tailwind, shadcn components)
    src/
    index.html
    vite.config.ts
```

## Prerequisites

- **Rust** ≥ 1.85 (the crate uses edition 2024)
- **Node.js** ≥ 20
- **Docker** (for PostgreSQL)

## Getting started

### 1. Start PostgreSQL

```sh
docker compose up -d
```

This starts a PostgreSQL 17 instance on `localhost:5432` with:
- user: `postgres`
- password: `postgres`
- database: `duilio`

### 2. Configure environment

The back-end reads its configuration from environment variables:

```sh
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/duilio
export JWT_SECRET=dev-only-insecure-secret   # optional in development
```

You can keep these in a `.env` file at the repo root and load them into your shell
(for example with [direnv](https://direnv.net) or `export $(grep -v '^#' .env | xargs)`).

> **Note:** the back-end uses SQLx's compile-time-checked queries, so a running,
> migrated database must be reachable via `DATABASE_URL` when you *build* the
> project — not just when you run it. For a brand-new database, apply the
> migrations first with [`sqlx-cli`](https://crates.io/crates/sqlx-cli)
> (`cargo install sqlx-cli`, then `cd back-end && sqlx migrate run`). After that
> the app also re-applies any pending migrations automatically on startup.

### 3. Run the back-end

```sh
cd back-end
cargo run
```

On startup it applies pending migrations from `back-end/migrations/` and listens on
`http://localhost:3000`.

### 4. Run the front-end

```sh
cd front-end
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173` and proxies `/api` requests to
the back-end on port `3000`. Open `http://localhost:5173` in your browser.

## Building for production

```sh
# Front-end: produces static assets in front-end/dist
cd front-end && npm run build

# Back-end: an optimized binary in back-end/target/release
cd ../back-end && cargo build --release
```

The back-end serves the API only; deploy the built front-end (`front-end/dist`)
through your static host or reverse proxy of choice, routing `/api` to the Rust
server.

## API reference

All endpoints require a `Bearer` JWT in the `Authorization` header except the auth
routes. The token is returned by `POST /api/auth/login`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user `{ email, password }` → `{ id, email, createdAt }` |
| `POST` | `/api/auth/login` | Login `{ email, password }` → `{ token, user: { id, email } }` |

### Todos

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/todos` | List the current user's todos (with tags), newest first |
| `POST` | `/api/todos` | Create a todo `{ title, description?, dueDate?, status?, tagIds? }` |
| `PATCH` | `/api/todos/:id` | Update a todo (any subset of fields + `tagIds?`) |
| `PATCH` | `/api/todos/:id/status` | Update only the status `{ status }` |
| `DELETE` | `/api/todos/:id` | Delete a todo |

`status` is one of `todo`, `in-progress`, `done`.

### Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tags` | List the current user's tags |
| `POST` | `/api/tags` | Create a tag `{ name, color }` — returns `409` if the name already exists |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check; reports database connectivity |

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string (needed at build time and run time) |
| `JWT_SECRET` | no | `dev-only-insecure-secret` | Secret used to sign and verify JWTs — **set a strong value in production** |

The back-end listens on `0.0.0.0:3000`.
