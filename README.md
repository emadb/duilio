# Duilio

A full-stack personal task manager: a React (Vite + Tailwind + shadcn) front-end and a
Rust (Axum + SQLx) API back-end, backed by PostgreSQL.

## Project structure

The Rust crate lives at the repository root and is the whole application — it
serves both the API and the built front-end. The React app is a sub-folder.

```
duilio/
  Cargo.toml           # Rust crate (package "duilio")
  src/
    main.rs            # entry point: builds the router, runs migrations, serves the SPA
    auth_middleware.rs
    modules/           # feature modules: auth, todos, tags, health
  migrations/          # SQL migrations (applied automatically at startup)
  .sqlx/               # SQLx offline query cache (used for the Docker build)
  front-end/           # React SPA (Vite, Tailwind, shadcn components)
    src/
    index.html
    vite.config.ts
  static-assets/       # built front-end (generated; served by the Rust server)
  package.json         # root: builds the front-end (npm workspace)
  Dockerfile           # multi-stage build → single deployable image
  docker-compose.yml   # local PostgreSQL service
  config/deploy.yml    # Kamal deployment config
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

The app reads its configuration from environment variables:

```sh
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/duilio
export JWT_SECRET=dev-only-insecure-secret   # optional in development
```

You can keep these in a `.env` file at the repo root and load them into your shell
(for example with [direnv](https://direnv.net) or `export $(grep -v '^#' .env | xargs)`).

> **Note:** the app uses SQLx's compile-time-checked queries, so a running,
> migrated database must be reachable via `DATABASE_URL` when you *build* the
> project — not just when you run it. For a brand-new database, apply the
> migrations first with [`sqlx-cli`](https://crates.io/crates/sqlx-cli)
> (`cargo install sqlx-cli`, then `sqlx migrate run`). After that the app also
> re-applies any pending migrations automatically on startup.

### 3. Run the app

```sh
cargo run
```

On startup it applies pending migrations from `migrations/` and listens on
`http://localhost:3000`. If a `static-assets/` build is present it is served at the
same address (see production below).

### 4. Run the front-end dev server

For hot-reloading UI work, run Vite alongside `cargo run`:

```sh
npm install          # once, from the repo root
npm run dev          # Vite dev server (alias for `npm run dev -w front-end`)
```

The Vite dev server runs at `http://localhost:5173` and proxies `/api` requests to
the app on port `3000`. Open `http://localhost:5173` in your browser.

## Building for production

The application ships as a **single binary** that serves the API and the built
front-end. Build the front-end first, then run/build the Rust app:

```sh
npm run build        # from the root → produces static-assets/
cargo build --release
```

At runtime the server serves static files from the directory in `STATIC_DIR`
(default `static-assets`), falling back to `index.html` for client-side routes.

### Container image (Kamal)

The `Dockerfile` performs the whole build — front-end assets, Rust binary, and a
slim runtime image that serves everything on port `3000`:

```sh
docker build -t duilio .
```

The Rust build runs with `SQLX_OFFLINE=true` against the `.sqlx/` cache, so no
database is needed during the image build. Regenerate that cache whenever you change
a SQL query: `cargo sqlx prepare` (requires `sqlx-cli` and a reachable
`DATABASE_URL`). Deployment is driven by `config/deploy.yml` (Kamal); migrations run
automatically when the container boots.

> `.sqlx/` is currently in `.gitignore`. Kamal builds the image from your working
> tree, so local deploys work as-is. If you build from a fresh clone or CI, commit
> `.sqlx/` instead (remove it from `.gitignore`).

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
