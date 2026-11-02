# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Rust)
```sh
cargo build          # debug build
cargo build --release
cargo run            # starts API on :3000, auto-applies migrations
cargo test           # all tests (unit tests of pure functions, next to the code)
cargo test <name>    # run a single test by name
cargo fmt && cargo clippy --all-targets -- -D warnings   # CI runs both
```

### Frontend (React)
```sh
npm install          # once, from repo root (npm workspace)
npm run dev          # Vite dev server on :5173 (proxies /api → :3000)
npm run build        # TypeScript check + Vite build → static-assets/
cd front-end && npx tsc --noEmit  # type-check only
```
The front-end has no test runner and no lint script.

### Database
```sh
docker compose up -d           # PostgreSQL 17 on :5432
sqlx migrate run               # apply pending migrations manually
cargo sqlx prepare -- --all-targets   # regenerate .sqlx/ after changing SQL queries
SQLX_OFFLINE=true cargo build  # check that the offline cache is complete
```

## Environment

Requires `DATABASE_URL` at **build time** (not just runtime) due to sqlx compile-time query checking. A `.env` file at repo root is the standard approach (it is gitignored).

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/duilio
JWT_SECRET=dev-only-insecure-secret
```

Variables read by `src/config.rs`:
- `DATABASE_URL` — defaults to the local docker database.
- `PORT` — default `3000`. Use another port to run a second instance for tests.
- `STATIC_DIR` — built front-end, default `static-assets`.
- `APP_ENV=production` — makes `JWT_SECRET` required (the process exits without it). In development a weak default is used.

For a fresh database: apply migrations with `sqlx migrate run` before running `cargo build`. Use a throwaway database for tests that write data, not the dev database.

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

Each feature is a module under `src/modules/`: `auth`, `health`, `tags`, `todos`, `weeks`, `import`.
- `router.rs` — Axum handlers, request/response types, route registration via `build_routes()`
- `repository.rs` — all SQL (via `sqlx::query_as!` / `query!` macros), domain types
- `mod.rs` — module declarations

Business rules live in **pure functions** next to the module, with unit tests in the same file (functional core, imperative shell). The router and repository are the shell:
- `todos/transitions.rs` — `apply_status`: the rules of a status change (which fields are set or cleared).
- `weeks/week.rs` — week maths with `chrono-tz`: `week_of`, `week_start_instant`, `parse_tz`.
- `weeks/review.rs` — which cards need a decision (`is_reviewable`), `apply_decision`, `plan_review`.
- `weeks/log.rs` — `group_log`: groups done cards by week.
- `import/trello.rs` — `map_trello`: maps a Trello board export to cards.

All API routes require a Bearer JWT, except `/health` and the two `/api/auth/*` routes (those have a rate limit). `auth_middleware.rs` validates the token and injects `Claims` (containing `user_id`) via Axum's `Extension`. Handlers extract it with `Extension(claims): Extension<Claims>`. Every query must filter by the user id.

The `PgPool` is the sole shared state, passed through Axum's `State`.

### Weekly workflow (domain rules)

The product spec is `docs/weekly-workflow-spec.md`. Plans and decisions: `docs/weekly-workflow-plan.md`. Summary:
- Six statuses (`todo_status` enum): `idea`, `todo` (This week), `in-progress` (Doing), `blocked` (Blocked), `paused`, `done`. The UI label of `blocked` is "Blocked"; the field that says who or what blocks it is `waiting_on`.
- A week is identified by its Monday (`week_start`, a date) in the user's time zone (`users.timezone`, default and fallback `Europe/Rome`). Week logic is in Rust, not in SQL.
- `weeks` rows are created on first access by `GET /api/weeks/current`. The Monday review: `GET /api/review` and `POST /api/review/complete` (one transaction, 409 when the week is already reviewed). The Done log: `GET /api/log` (a review note is shown on the week before the review). Trello import: `POST /api/import/trello` (body is the board JSON, `?dryRun=true` only counts).
- Status changes go through `apply_status`. Moving to `blocked` needs `waiting_on`, moving to `paused` needs a Monday in `paused_until`. The import writes with its own insert because imported blocked cards have no `waiting_on`.
- Tags belong to a user. The color of a tag is stored on the server (`PATCH /api/tags/{id}`).

### Migrations

- Never edit an applied migration. Add a new file.
- A new enum value cannot be used in the transaction that adds it: put `ALTER TYPE ... ADD VALUE` in its own migration file.
- `05_blocked_status.sql` has a wrong directive comment (`-- disable-migration-transaction`). It works. Leave it.
- Do not add Monday `CHECK` constraints: Mondays are validated in Rust.

### Frontend structure

The board renders one `StatusSection` column per entry in the `STATUSES` array (`front-end/src/constants/index.ts`). **This array is the single source of truth** for which statuses exist, their display labels, dot colors, and ordering. A status with `drawer: true` (Done) shows as a collapsed section under the board instead of a column. Adding or removing a status requires:
1. A DB migration (alter the `todo_status` enum)
2. A new variant in `TodoStatus` in `todos/repository.rs`, and a rule in `transitions.rs` if the status needs data
3. A new entry in the `STATUSES` array and the `TaskStatus` union type
4. Check `weeks/review.rs` (`is_reviewable`) and `import/trello.rs` (`count_cards`), which match on the statuses

The `TaskModal` status dropdown, the review screen labels and `App.tsx` columns derive from `STATUSES`.

Files that matter:
- `src/hooks/useTasks.ts` — API calls and client-side state for tasks, tag colors and the current week. `src/hooks/useReview.ts` — the Monday review. `src/services/api.ts` — all HTTP calls and the mapping from backend types.
- `src/App.tsx` — top-level orchestrator; auth-gated; shows the review screen before the board when the week is not reviewed; switches between the board and the log.
- `src/components/` — `WeeklyReview`, `WeeklyLog`, `TrelloImport`, `StatusPrompt` (asks who blocks a card, or the return week of a paused card), `TaskModal`, `TaskCard`, `StatusSection` (with the ghost "Add task" card), `AppHeader`.
- `src/utils/helpers.ts` holds the pure helpers (badges, week labels, markdown for a week). `src/utils/styles.ts` holds the shared button styles.
- Theme: the "Streamline" tokens are CSS variables (`--eui-*`) defined in `src/main.tsx`: ink outlines, flat shadows, ink-black primary color, Poppins font (loaded in `index.html`). Components use inline styles that read these variables. Do not use coral for primary actions: it looks like the tag colors.
- Tags: the server is the source of truth for tags and colors. A color picked before the tag exists stays in `localStorage` (`tm_tagColors`) until the next load. Tag suggestions come only from tags that exist on the server.

### sqlx offline cache

`.sqlx/` holds pre-compiled query metadata used when building the Docker image (`SQLX_OFFLINE=true`). Regenerate it with `cargo sqlx prepare -- --all-targets` after any SQL query change (the installed `sqlx-cli` can be newer than the crate, this works). It is in `.gitignore`; Kamal builds from the working tree so local deploys work without committing it. A fresh clone has no `.sqlx/`: generate it before a deploy.

### Deployment

Kamal (`config/deploy.yml`) builds and deploys a single Docker image. Migrations run automatically on container startup via `sqlx::migrate!` in `main.rs`.

### Continuous integration

`.github/workflows/ci.yml` runs on every push to any branch and on pull requests to `main`. The backend job starts a Postgres 17 service and applies `migrations/*.sql` with `psql`, because sqlx checks queries against a live database at build time (`.sqlx/` is not in git). Then it runs `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings` and `cargo test`. The front-end job runs `npm ci` and `npm run build` (type check plus Vite). A new migration needs no CI change: the job applies every file in `migrations/` in name order.

### Docs

`docs/` holds the weekly workflow spec and plans, the UI notes (`UI-review.md`, `UI-cleanup-plan.md`) and the code review with its open items (`code-review.md`). `README.md` is the general introduction and the API reference.
