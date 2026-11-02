# Duilio

A full-stack personal task manager built around a weekly routine: a React (Vite) front-end
and a Rust (Axum + SQLx) API back-end, backed by PostgreSQL.

Cards live in six lists: Ideas, This week, Doing, Blocked, Paused and Done. Every Monday
a review asks for a decision on each unfinished card. Completed cards go to a weekly log
that can be copied as markdown. A Trello board can be imported once. The full spec is in
[`docs/weekly-workflow-spec.md`](docs/weekly-workflow-spec.md).

## Project structure

The Rust crate lives at the repository root and is the whole application — it
serves both the API and the built front-end. The React app is a sub-folder.

```
duilio/
  Cargo.toml           # Rust crate (package "duilio")
  src/
    main.rs            # entry point: builds the router, runs migrations, serves the SPA
    auth_middleware.rs
    modules/           # feature modules: auth, health, tags, todos, weeks, import
  migrations/          # SQL migrations (applied automatically at startup)
  .sqlx/               # SQLx offline query cache (used for the Docker build)
  front-end/           # React SPA (Vite, TypeScript, inline styles with CSS variables)
    src/
    index.html
    vite.config.ts
  static-assets/       # built front-end (generated; served by the Rust server)
  package.json         # root: builds the front-end (npm workspace)
  Dockerfile           # multi-stage build → single deployable image
  docker-compose.yml   # local PostgreSQL service
  config/deploy.yml    # Kamal deployment config
  .github/workflows/   # CI: formatting, lint, tests and front-end build on every push
  docs/                # product spec, plans and UI notes
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
a SQL query: `cargo sqlx prepare -- --all-targets` (requires `sqlx-cli` and a reachable
`DATABASE_URL`). Deployment is driven by `config/deploy.yml` (Kamal); migrations run
automatically when the container boots.

> `.sqlx/` is currently in `.gitignore`. Kamal builds the image from your working
> tree, so local deploys work as-is. If you build the image from a fresh clone,
> generate `.sqlx/` first or commit it (remove it from `.gitignore`). The CI workflow
> does not need it: it starts a Postgres service and applies the migrations.

## API reference

All endpoints require a `Bearer` JWT in the `Authorization` header except `/health` and
the auth routes. The token is returned by `POST /api/auth/login`. The auth routes have a
rate limit.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user `{ email, password }` → `{ id, email, createdAt }` |
| `POST` | `/api/auth/login` | Login `{ email, password }` → `{ token, user: { id, email } }` |

### Todos

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/todos` | List the current user's todos (with tags), newest first |
| `POST` | `/api/todos` | Create a todo `{ title, description?, dueDate?, status?, waitingOn?, pausedUntil?, important?, tagIds? }` |
| `PATCH` | `/api/todos/:id` | Update a todo (any subset of the fields above) |
| `PATCH` | `/api/todos/:id/status` | Update only the status `{ status, waitingOn?, pausedUntil? }` |
| `DELETE` | `/api/todos/:id` | Delete a todo |

`status` is one of `idea` (default for a new card), `todo`, `in-progress`, `blocked`,
`paused`, `done`. Moving a card to `blocked` needs `waitingOn` (who or what blocks it).
Moving it to `paused` needs `pausedUntil`, a Monday (`YYYY-MM-DD`). An invalid change
returns `400` with a message. The response also has `statusChangedAt`, `waitingSince`,
`completedAt` and `rolloverCount`, which the server sets.

### Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tags` | List the current user's tags |
| `POST` | `/api/tags` | Create a tag `{ name, color }`, where `color` looks like `#RRGGBB`. It fails if the name already exists |
| `PATCH` | `/api/tags/:id` | Change the color of a tag `{ color }` |

### Weeks, review and log

A week starts on Monday, in the user's time zone (default `Europe/Rome`).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/weeks/current` | The current week `{ weekStart, startsAt, reviewedAt, note }`. Creates the week on first access |
| `GET` | `/api/review` | `{ weekStart, needsReview, cards }`: the cards that need a decision this week |
| `POST` | `/api/review/complete` | `{ decisions: [{ id, action, pausedUntil? }], note? }`. One decision per card. `action` is `keep-todo`, `keep-doing`, `still-waiting`, `to-ideas`, `pause` or `delete`. Returns `400` if a card has no decision, `409` if the week is already reviewed |
| `GET` | `/api/log` | Completed cards grouped by week, newest first: `[{ weekStart, count, note, cards }]` |

### Import

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/import/trello` | The body is the JSON text of a Trello board export. Returns the counts per list. With `?dryRun=true` it only counts. Duplicates are not detected |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check; reports database connectivity |

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | local docker database | PostgreSQL connection string (needed at build time and run time) |
| `JWT_SECRET` | in production | `dev-only-insecure-secret` | Secret used to sign and verify JWTs. With `APP_ENV=production` the app exits if it is missing |
| `APP_ENV` | no | — | Set to `production` in deployments |
| `PORT` | no | `3000` | TCP port of the server |
| `STATIC_DIR` | no | `static-assets` | Directory of the built front-end |

## Continuous integration

`.github/workflows/ci.yml` runs on every push and on pull requests to `main`. The back-end
job checks formatting (`cargo fmt --check`), runs `cargo clippy -- -D warnings` and
`cargo test` against a Postgres service. The front-end job runs `npm ci` and
`npm run build`.
