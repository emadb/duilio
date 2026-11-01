# Weekly workflow — Step 1 plan: migration

Source: `docs/weekly-workflow-spec.md` → Build order, step 1.
Scope: database schema + the minimum Rust change to keep the backend compiling and decoding. No front-end changes. No new API behavior.

## Current state (observed 2026-11-01)

- Migrations `01`–`06` applied on the local DB (`localhost:5432/duilio`, Docker `postgres:17`).
- Local data: 20 todos (`todo` 16, `in-progress` 2, `blocked` 1, `done` 1).
- `todos_status_check` was already dropped in `05`. Only the enum restricts `status`.
- `05_blocked_status.sql` starts with `-- disable-migration-transaction`. SQLx 0.8.6 only knows `-- no-transaction`, so `05` ran inside a transaction. This works on PG ≥ 12, but a new enum value cannot be *used* in the same transaction that adds it.
- Installed `sqlx-cli` is 0.9.0. The crate is 0.8.6.

## Data flow / state changes

```
before:  todo_status = {todo, in-progress, blocked, done}
         todos(..., status, important, created_at, updated_at)
         users(id, email, password_hash, created_at, updated_at)

after:   todo_status = {idea, todo, in-progress, blocked, paused, done}
         todos + status_changed_at, waiting_on, waiting_since,
                 paused_until, completed_at, rollover_count
         users + timezone
         weeks(user_id, week_start, reviewed_at, note, created_at)

backfill: status_changed_at = updated_at        (all rows)
          completed_at      = updated_at        (status = 'done')
          waiting_since     = updated_at        (status = 'blocked')
```

## Items

### 1. Migration `07_weekly_statuses.sql` — status: done
- Goal: add enum values, ordered like the spec table.
  ```sql
  ALTER TYPE todo_status ADD VALUE 'idea' BEFORE 'todo';
  ALTER TYPE todo_status ADD VALUE 'paused' BEFORE 'done';
  ```
- Separate file because a new enum value cannot be used in the transaction that adds it (see ADR-1).
- Files: `migrations/07_weekly_statuses.sql`
- Acceptance: `SELECT enum_range(NULL::todo_status)` returns `{idea,todo,in-progress,blocked,paused,done}`.

### 2. Migration `08_weekly_workflow.sql` — status: done
- Goal: new columns, `weeks` table, user time zone, backfill.
  - `todos`:
    - `status_changed_at timestamptz DEFAULT now() NOT NULL`
    - `waiting_on text`
    - `waiting_since timestamptz`
    - `paused_until date`
    - `completed_at timestamptz`
    - `rollover_count integer DEFAULT 0 NOT NULL`
  - `users.timezone text DEFAULT 'Europe/Rome' NOT NULL`
  - `weeks`:
    - `user_id uuid NOT NULL`, `week_start date NOT NULL`, `reviewed_at timestamptz`, `note text DEFAULT '' NOT NULL`, `created_at timestamptz DEFAULT now() NOT NULL`
    - `CONSTRAINT weeks_user_id_week_start_pk PRIMARY KEY (user_id, week_start)`
    - FK `weeks_user_id_users_id_fk` → `users(id) ON DELETE cascade ON UPDATE no action`
  - Backfill:
    ```sql
    UPDATE todos SET status_changed_at = updated_at;
    UPDATE todos SET completed_at = updated_at WHERE status = 'done';
    UPDATE todos SET waiting_since = updated_at WHERE status = 'blocked';
    ```
- Style: same as existing files (lowercase types written as `timestamp with time zone`, tab indentation, explicit constraint names `<table>_<cols>_<kind>`).
- Files: `migrations/08_weekly_workflow.sql`
- Acceptance:
  - Local DB: `count(*) WHERE status_changed_at <> updated_at` = 0; `count(*) WHERE status = 'done' AND completed_at IS NULL` = 0; `completed_at` NULL for non-done rows; `waiting_since = updated_at` for blocked rows.

### 3. Rust enum `TodoStatus` — status: done
- Goal: add `Idea` and `Paused` variants (`#[sqlx(rename = "idea")]`, `#[sqlx(rename = "paused")]`), as CLAUDE.md requires for new statuses. No query changes; repository does not read the new columns yet (step 2/3 will).
- Router default for new cards stays `TodoStatus::Todo` in this step. The switch to `Idea` belongs to step 2, together with the board.
- Files: `src/modules/todos/repository.rs`
- Acceptance: `cargo build` passes.

### 4. Apply + regenerate `.sqlx` — status: done
- Back up local DB first: `pg_dump` to the scratchpad.
- Apply with `cargo run` (embedded 0.8.6 migrator), not `sqlx migrate run` from cli 0.9, to avoid a checksum/format mismatch between versions.
- `cargo sqlx prepare` to refresh `.sqlx/` (enum variants are stored in the offline metadata). If cli 0.9 output is incompatible with the 0.8.6 macros, verify with `SQLX_OFFLINE=true cargo build`; fall back to installing `sqlx-cli@0.8.6`.
- Files: `.sqlx/*.json` (gitignored)
- Acceptance: `SQLX_OFFLINE=true cargo build` passes.

### 5. Verification — status: done
- Quality gate: `cargo fmt && cargo clippy --all-targets -- -D warnings && cargo test`.
- Fresh DB: create `duilio_fresh`, run the app against it so `01`–`08` apply from zero, then smoke: register → login → create todo → list todos (JSON still has the same shape) → drop `duilio_fresh`.
- Existing DB: run the backfill acceptance queries from item 2; `GET /api/todos` still returns the 20 cards with unchanged statuses.
- Acceptance: all commands pass; outputs reported.

## Decisions (mini-ADR)

- **ADR-1 — Two migration files.** Enum values go in `07`, everything else in `08`. Reason: SQLx runs each file in its own transaction; keeping them apart lets later SQL in `08` (or a future default change) use `'idea'`/`'paused'` safely. `-- no-transaction` is not needed. I will not touch `05` (editing an applied migration breaks its checksum).
- **ADR-2 — DB default for `status` stays `'todo'`.** The spec rule "new card lands in Ideas" is API behavior. It changes in step 2 together with the board, so step 1 does not change behavior of the current UI.
- **ADR-3 — `weeks` uses a composite PK `(user_id, week_start)`.** The spec defines the pair as unique and no other table references a week. `todo_tags` already uses a composite PK.
- **ADR-4 — No Monday CHECKs in the DB.** `week_start` and `paused_until` are validated in Rust commands only (decision Q2=B). Keeps the schema easy to change.
- **ADR-5 — `rollover_count` and `note` are NOT NULL with defaults.** Matches the existing `important` / `description` convention.
- **ADR-6 — Backfill `waiting_since` for blocked cards** with `updated_at` (decision Q1=A), so the badge works from day one. `waiting_on` stays NULL.

## Answers

Q1=A (backfill `waiting_since`), Q2=B (no DB CHECKs), Q3=A (default stays `'todo'`).
