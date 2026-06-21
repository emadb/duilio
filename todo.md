# Duilio — Codebase Review & Backlog

A deep review of the current state (backend, frontend, infrastructure) with concrete,
prioritized next steps. Goal: make the app **correct, well-written, and ready to evolve**.

Severity legend: 🔴 high (do first) · 🟡 medium · 🟢 low / nice-to-have.

---

## Overall assessment

**Strengths — the foundation is sound:**
- Clean backend module layout: one `router` + `repository` per feature (`auth`, `todos`, `tags`, `health`). Easy to navigate and extend.
- **Multi-tenant isolation is correctly implemented**: every todo/tag query is scoped by `user_id` (`WHERE id = $1 AND user_id = $2`), and tag-sync filters tags to the owner. No cross-user data access found.
- Compile-time-checked SQL (SQLx macros) — schema/query drift is caught at build time.
- Passwords hashed with bcrypt; JWT aligned with the previous TS backend; partial-update semantics (`dueDate` clear vs. keep) handled properly.
- Single-image deploy (Rust serves API + SPA) is simple and verified end-to-end.

**Biggest gaps for "ready to evolve":** no tests, no CI, no server-side input validation, no logging/observability, internal errors leaked to clients, and several security hardening items. None are architectural dead-ends — all are additive.

---

## 🔴 Top priorities (security & correctness)

### 2. No rate limiting on auth endpoints
`/api/auth/login` and `/api/auth/register` are unthrottled → brute-force and credential-stuffing exposure. The previous TS backend limited these to 10/min.
- **Action:** add rate limiting (e.g. `tower_governor`) on the auth routes, keyed by IP.

### 3. Multi-step writes are not transactional
- `TodoRepository::create` = insert todo → sync tags → re-fetch (3 statements, no tx).
- `TodoRepository::update` = fetch → update → sync tags (read-modify-write, no tx).
A failure mid-sequence leaves inconsistent state (todo with no/partial tags).
- **Action:** wrap each operation in a `sqlx::Transaction`.

### 4. Server-side input validation is missing
The backend trusts the client. Only `react-hook-form` validates (email format, password ≥ 6, non-empty title) — trivially bypassable by calling the API directly.
- `auth/router.rs`: `email` not format-checked; `password` has no length/complexity check → empty/weak passwords accepted.
- `todos/router.rs`: `title` can be `""` (TS enforced `minLength: 1`); `dueDate` parse errors return a raw 422.
- **Action:** add validation (e.g. the `validator` crate, or explicit checks) and return consistent `400` JSON `{ message }`. Mirror the rules the old TS JSON-schema enforced.


### 5. Internal error details leaked to clients (info disclosure)
Handlers return `e.to_string()` in 500 responses (10 occurrences) — SQL/driver errors reach the client.
- **Action:** log full errors server-side; return a generic `{ message: "Internal server error" }`. Introduce a single error type (e.g. `thiserror` + an `IntoResponse` impl) so handlers stop hand-rolling tuples.

### 6. No tests anywhere (backend or frontend)
This is the single biggest risk for evolving safely.
- **Action (backend):** integration tests against a throwaway Postgres (`#[sqlx::test]`): auth happy/again-path, todo & tag CRUD, and **an explicit authz test** (user A cannot read/update/delete user B's todos) to lock in tenant isolation.
- **Action (frontend):** Vitest + Testing Library for `AuthModal`, `TodoModal`, and the api client (mocked fetch).

---

## 🟡 Security hardening

- **Runtime container runs as root.** **Action:** add a non-root `USER` in the Dockerfile's runtime stage.
- **JWT secret has an insecure fallback.** `auth_middleware.rs::jwt_secret()` falls back to `"dev-only-insecure-secret"` when `JWT_SECRET` is unset. In production a missing var silently yields a *publicly known* signing key → forgeable tokens. **Action:** fail fast at startup if `JWT_SECRET` is unset in production (gate the fallback behind a dev flag).
- **Tokens stored in `localStorage`** → readable by any XSS. **Action:** either move to an `httpOnly` cookie (+ CSRF protection) or accept the trade-off and invest in XSS prevention + a strict CSP. Also: no token refresh/revocation (7-day token, logout is client-only).
- **Secret hygiene.** `.env` (gitignored — good) contains real values: `GITHUB_TOKEN`, `KAMAL_REGISTRY_PASSWORD`, `JWT_SECRET`, `POSTGRES_PASSWORD`. These have appeared in terminal output during development. **Action:** rotate any potentially-exposed credentials; add a `.env.example` with placeholders; double-check `.env` is never committed.
- **Account enumeration on register**: returns `400 "User already exists"`. Low priority but consider a neutral response.
- **No security headers / body-size limit.** **Action:** add `tower-http` layers — `RequestBodyLimitLayer`, and security headers (`X-Content-Type-Options`, a CSP for the served HTML). (`index.html` already sets `noindex`.)

---

## 🟡 Backend code quality & architecture

- **No logging / observability.** The server is silent (the old TS app had a request logger). **Action:** add `tracing` + `tracing-subscriber` and `tower_http::trace::TraceLayer`.
- **`createTag` TOCTOU.** Existence check then insert; a race hits the unique constraint and returns 500 instead of a clean 409. **Action:** rely on the unique constraint and map the unique-violation error to 409 (keep the pre-check only as an optimization).
- **No graceful shutdown / global timeout.** `axum::serve` runs without a shutdown signal or request timeout, and the pool is never closed. **Action:** add `with_graceful_shutdown` and a `TimeoutLayer`.
- **No `.env` auto-loading** for local dev (no `dotenvy`) — devs must `export` manually. Minor convenience add.

---

## 🟡 Frontend

- **Auto-logout on expired token is broken.** The auth middleware returns `401` with an **empty body**, so `api.ts` produces the message `"Request failed (401)"`, and `App.tsx` checks `err.message.includes('Unauthorized')` — which never matches. **Action:** return a JSON body on 401 from the middleware, and/or handle 401 centrally in `api.ts` (it already clears the token) by redirecting to login instead of string-matching.
- **No error boundary**; error handling relies on toast + fragile string matching.
- **No shared FE/BE types.** `types.ts` hand-mirrors the backend DTOs. Consider generating types from an OpenAPI spec later to prevent drift.
- Filtering & (lack of) pagination are client-side only — fine at current scale, revisit as data grows.

---

## 🟡 Infrastructure & deployment

- **No database backups.** The Kamal Postgres accessory persists to a volume only. **Action:** scheduled `pg_dump` to off-host storage before depending on prod data.
- **Migrations run on app boot** (embedded via `sqlx::migrate!`). Fine for a single replica, but risky for zero-downtime / multi-replica or backward-incompatible changes. **Action:** document a migration strategy; consider running migrations as a discrete release step (the `pre-app-boot` hook already exists as a place for this).
- **`.sqlx` is gitignored** → a fresh clone or CI cannot run the offline Docker build (only your local working tree can). **Action:** commit `.sqlx/` for reproducible builds (remove it from `.gitignore`).
- **No CI pipeline.** **Action:** GitHub Actions on PRs: `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, `tsc --noEmit`, `npm run build`, and a `docker build`.
- **No `.env.example`** — onboarding requires guessing the env vars.
- **No monitoring/alerting/log aggregation.** **Action:** add uptime checks (e.g. healthchecks.io hitting `/health`) and error tracking (e.g. Sentry) as the app grows. Optionally wire the Kamal proxy healthcheck to `/health`.
- 🟢 Consider a `distroless` runtime base for a smaller attack surface.
- 🟢 No tooling config committed: add `rustfmt.toml` / `clippy.toml` and ESLint + Prettier for the frontend to keep style consistent.

