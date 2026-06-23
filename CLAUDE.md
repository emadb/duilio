# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Rust)
```sh
cargo build          # debug build
cargo build --release
cargo run            # starts API on :3000, auto-applies migrations
cargo test           # all tests (unit tests live in router files)
cargo test <name>    # run a single test by name
```

### Frontend (React)
```sh
npm install          # once, from repo root
npm run dev          # Vite dev server on :5173 (proxies /api → :3000)
npm run build        # TypeScript check + Vite build → static-assets/
cd front-end && npx tsc --noEmit  # type-check only
```

### Database
```sh
docker compose up -d           # PostgreSQL 17 on :5432
sqlx migrate run               # apply pending migrations manually
cargo sqlx prepare             # regenerate .sqlx/ cache after changing SQL queries
```

## Environment

Requires `DATABASE_URL` at **build time** (not just runtime) due to sqlx compile-time query checking. A `.env` file at repo root is the standard approach.

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/duilio
JWT_SECRET=dev-only-insecure-secret
```

For a fresh database: apply migrations with `sqlx migrate run` before running `cargo build`.

## Architecture

### Request flow

```
Browser → Vite dev server (:5173)
             └── /api/* → proxied to Rust (:3000)
             └── other  → served by Vite

Browser → Rust (:3000) [production]
             └── /api/*  → Axum router
             └── other   → static-assets/ (built SPA) with index.html fallback
```

The production binary serves both the API and the SPA — a single `cargo build --release` after `npm run build` is the full artifact.

### Backend structure

Each feature is a module under `src/modules/` with three files:
- `router.rs` — Axum handlers, request/response types, route registration via `build_routes()`
- `repository.rs` — all SQL (via `sqlx::query_as!` macros), domain types
- `mod.rs` — re-exports

All API routes require a Bearer JWT. `auth_middleware.rs` validates the token and injects `Claims` (containing `user_id`) via Axum's `Extension`. Handlers extract it with `Extension(claims): Extension<Claims>`.

The `PgPool` is the sole shared state, passed through Axum's `State`.

### Frontend structure

The board renders one `StatusSection` column per entry in the `STATUSES` array (`front-end/src/constants/index.ts`). **This array is the single source of truth** for which statuses exist, their display labels, colors, and ordering. Adding or removing a status requires:
1. A DB migration (alter the `todo_status` enum)
2. A new variant in `TodoStatus` in `repository.rs`
3. A new entry in the `STATUSES` array and the `TaskStatus` union type

The `SummaryBar`, `TaskModal` status dropdown, and `App.tsx` column filter all derive from `STATUSES` — no other files need changing.

`useTasks` (`src/hooks/useTasks.ts`) owns all API calls and client-side task state. `App.tsx` is the top-level orchestrator; it is auth-gated and renders `TaskApp` only when a token is present in `localStorage`.

### sqlx offline cache

`.sqlx/` holds pre-compiled query metadata used when building the Docker image (`SQLX_OFFLINE=true`). Regenerate it with `cargo sqlx prepare` after any SQL query change. It is in `.gitignore`; Kamal builds from the working tree so local deploys work without committing it.

### Deployment

Kamal (`config/deploy.yml`) builds and deploys a single Docker image. Migrations run automatically on container startup via `sqlx::migrate!` in `main.rs`.
