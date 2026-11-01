# Weekly workflow — Plan for steps 2–5

Source: `docs/weekly-workflow-spec.md` (build order). Step 1 is done (`docs/weekly-workflow-step1-plan.md`, branch `weekly-step1-migration`).
Step 6 (3–4 weeks of use) is not code. It is out of this plan.

## Working mode

- One branch per step. Each branch starts from the previous step's branch (stacked), because step 1 is not merged yet.
- One commit per item when the item is done. Push the branch when the step is complete.
- No pull requests. The user creates them manually.
- Quality gate before each commit: `cargo fmt && cargo clippy --all-targets -- -D warnings && cargo test`, `npx tsc --noEmit` in `front-end/`, `npm run build`.
- Test convention: the project has unit tests of pure functions inside router files, and no e2e harness. I follow it: pure functions get unit tests; each endpoint gets a smoke test with `curl` on a fresh database.
- Statuses: `todo` / `doing` / `done` / `blocked`.

## Current code facts (read 2026-11-01)

- `TodoRepository::update` does a read-then-write of the whole row. It has no knowledge of status transitions.
- `PATCH /api/todos/{id}` and `PATCH /api/todos/{id}/status` both call `update`.
- `list_by_user` returns all todos, ordered by `created_at DESC`. Front-end filters by status.
- `STATUSES` in `front-end/src/constants/index.ts` drives columns, filters, summary bar and the modal dropdown.
- `front-end/src/services/api.ts` has its own `BackendTodo` type with a status union (`'todo' | 'in-progress' | 'done'`, without `blocked`). It must be fixed in step 2.
- Front-end has no test runner.
- The API default status is `todo`. The spec says new cards land in Ideas.

## Decisions needed before step 2

**D1 — Where does the "current week" come from?** (answered: B)
It depends on the user's time zone (`users.timezone`). Needed by steps 2 (Done this week), 3 and 5.
- **A: Postgres.** `date_trunc('week', now() AT TIME ZONE u.timezone)::date`. No new crate. Week logic lives in SQL.
- **B: `chrono-tz` crate.** Pure Rust functions, easy unit tests. Adds a dependency (your rule: ask first).
- I recommend A: no dependency, and the time zone database is already in Postgres. Pure helpers still exist for formatting only.

**D2 — Where do status transition rules live?** (answered: A)
Rules: set `status_changed_at`; set/clear `completed_at`; set `waiting_since` and require `waiting_on`; require `paused_until`; clear the fields of the previous status.
- **A: A pure function `apply_status(card, new_status, input, now)` in a new `src/modules/todos/transitions.rs`.** `update` calls it. Easy to unit test. Matches "functional core".
- **B: SQL `CASE` expressions inside the `UPDATE`.** Fewer round trips, but hard to test.
- I recommend A.

**D3 — Trello import transport.** (answered: A)
- **A: JSON body.** The front-end reads the file with `FileReader` and posts the JSON text. No new crate or axum feature.
- **B: multipart upload.** Needs the axum `multipart` feature.
- I recommend A.

## Step 2 — Board (branch `weekly-step2-board`)

Data flow: card moves in the UI → `PATCH /api/todos/{id}` with `status` plus optional `waitingOn` / `pausedUntil` → `transitions::apply_status` → one `UPDATE` → response includes the new fields → UI badges update.

### 2.1 Backend: transitions (pure) — status: done
- Goal: implement `apply_status` (D2=A) and unit tests.
- Rules:
  - same status → no change to any field
  - `status_changed_at = now` on every real change
  - to `done` → `completed_at = now`; from `done` → `completed_at = NULL`
  - to `blocked` → `waiting_on` required (non-empty), `waiting_since = now`
  - from `blocked` → clear `waiting_on`, `waiting_since`
  - to `paused` → `paused_until` required and must be a Monday
  - from `paused` → clear `paused_until`
  - to `idea` → `rollover_count = 0`
- Files: `src/modules/todos/transitions.rs`, `src/modules/todos/mod.rs`
- Acceptance: unit tests cover each rule, plus the error cases. `cargo test` passes.

### 2.2 Backend: repository and API — status: done
- Goal: `Todo` and `TodoRow` expose the six new fields (camelCase). `update` and `create` use `apply_status`. Default status becomes `idea` (spec rule). Validation errors return 400 with a message.
- Request additions: `waitingOn`, `pausedUntil` (date string).
- Response additions: `statusChangedAt`, `waitingOn`, `waitingSince`, `pausedUntil`, `completedAt`, `rolloverCount`.
- `GET /api/todos` stays a full list; the front-end hides old Done cards (see 2.4).
- Files: `src/modules/todos/repository.rs`, `src/modules/todos/router.rs`, `.sqlx/` (regenerate).
- Acceptance: `curl` on a fresh DB: create without status → `idea`; move to `blocked` without `waitingOn` → 400; with it → 200 and `waitingSince` set; move to `done` → `completedAt` set; move back → `completedAt` null; move to `paused` with a non-Monday → 400. `SQLX_OFFLINE=true cargo build` passes.

### 2.3 Front-end: types, constants, API mapping — status: done
- Goal: add `idea` and `paused`; rename labels (Ideas, This week, Doing, Waiting on, Paused, Done); fix the `BackendTodo` status union; map the new fields into `Task`.
- `STATUSES` keeps the single-source-of-truth role. Add a `drawer: true` flag on Paused so the board skips it.
- Files: `front-end/src/types/task.ts`, `front-end/src/constants/index.ts`, `front-end/src/services/api.ts`
- Acceptance: `npx tsc --noEmit` passes.

### 2.4 Front-end: columns, drawer, badges — status: todo
- Goal: five board columns; Paused drawer (collapsed by default, count in the header); Done column shows only cards with `completedAt` in the current week (the API returns `weekStart` from 2.5; the front-end compares `completedAt` against it); badges per the spec table (days in column, waiting on, return week, rollover, completed on).
- Files: `front-end/src/App.tsx`, `StatusSection.tsx`, `TaskCard.tsx`, `SummaryBar.tsx`, new `common/Badge` helpers in `front-end/src/utils/helpers.ts`.
- Acceptance: build passes; browser check with screenshots of all columns, the drawer, and each badge.

### 2.5 Backend: current week endpoint — status: done
- Goal: `GET /api/weeks/current` → `{ weekStart, reviewedAt, note }`. Creates the `weeks` row if missing (D1=B). Used by 2.4 and step 3.
- Files: new module `src/modules/weeks/{mod,router,repository}.rs`, `src/modules/mod.rs`, `src/main.rs`.
- Goal detail: pure `week_start(now, tz) -> NaiveDate` in `src/modules/weeks/week.rs`; an unknown time zone name falls back to `Europe/Rome`.
- Acceptance: unit tests for the boundary (Sunday 23:30 vs Monday 00:30 in Rome, DST change week, `Pacific/Auckland`); `curl` returns the Monday of the current week.
- Order note: do 2.5 before 2.4.

### 2.6 Front-end: prompts — status: todo
- Goal: dropping a card on Waiting on asks "who?"; on Paused asks for the return week (week picker that only offers Mondays). The same fields appear in `TaskModal` when the status is selected there. Cancel reverts the move.
- Files: new `components/StatusPrompt/StatusPrompt.tsx`, `TaskModal.tsx`, `useTasks.ts`
- Acceptance: browser check of drag → prompt → confirm and → cancel; 400 errors show a message.

## Step 3 — Monday review (branch `weekly-step3-review`)

Data flow: app opens → `GET /api/review` → `{ weekStart, needsReview, cards[] }` → review screen → `POST /api/review/complete` with one decision per card + optional note → server applies all decisions in one transaction → sets `weeks.reviewed_at` → board.

### 3.1 Backend: review detection and cards — status: todo
- Goal: `GET /api/review`. `needsReview` is true when the current week has no `reviewed_at`. Cards: `todo` not done, `in-progress`, `blocked`, and `paused` with `paused_until <= weekStart`. A user with no cards and no past data does not see a review (nothing to decide).
- If a week was skipped, one review covers all (no per-week loop).
- Files: `src/modules/weeks/*`
- Acceptance: unit tests for the card selection predicate (pure function); `curl` on seeded data.

### 3.2 Backend: complete review — status: todo
- Goal: `POST /api/review/complete` body `{ decisions: [{ id, action, pausedUntil? }], note? }`. Actions: `keep-todo`, `keep-doing`, `still-waiting`, `to-ideas`, `pause`, `delete`. Pure function `apply_decision` reuses `transitions` and bumps `rollover_count` on keep actions. Every reviewable card must have a decision, otherwise 400 and nothing changes. Bulk actions are client-side: they only fill the decisions list.
- Files: `src/modules/weeks/*`, `src/modules/todos/transitions.rs`
- Acceptance: unit tests per action; `curl`: a partial decision list → 400 and no change; a full list → 200, `reviewed_at` set, a second call → 409.

### 3.3 Front-end: review screen — status: todo
- Goal: full-screen review before the board; one row per card with the badges ("in Doing for N days", who/since); per-card action buttons (Waiting cards get "Still waiting"); bulk buttons "Keep all as they are" and "Move all remaining to Ideas"; optional note; "Review later" goes to the board with a banner until done.
- Files: new `components/WeeklyReview/*`, `App.tsx`, `services/api.ts`, `hooks/useReview.ts`
- Acceptance: browser check with screenshots: review shown, each action, bulk, review later + banner, completion, reload shows no review.

## Step 4 — Trello import (branch `weekly-step4-import`)

### 4.1 Backend: pure mapping — status: todo
- Goal: `map_trello(json) -> Vec<NewCard>` per the spec table. Archived cards skipped. Checklists appended as `- [ ]` / `- [x]` markdown. Labels become tags. Unknown list names are reported, not guessed. Waiting cards: `waiting_on` stays empty (the spec says so), which conflicts with the 2.1 rule "waiting_on required". Import writes through a dedicated insert, not through `apply_status`.
- Files: `src/modules/import/{mod,trello}.rs`
- Acceptance: unit tests with a small JSON fixture (no real user data in the repo).

### 4.2 Backend: endpoint — status: todo
- Goal: `POST /api/import/trello` (D3=A). One transaction. Returns counts per list and skipped cards. Tags are created or reused per user. No deduplication in v1: the response says so, and the UI warns before a second import.
- Files: `src/modules/import/router.rs`, `src/main.rs`
- Acceptance: `curl` on a fresh DB with the fixture: counts match; second run doubles the cards (documented behavior).

### 4.3 Front-end: import UI — status: todo
- Goal: file input in the header menu, preview of counts, confirm, result message.
- Files: `AppHeader.tsx`, new `components/TrelloImport/*`, `services/api.ts`
- Acceptance: browser check with the fixture.

## Step 5 — Weekly Done log (branch `weekly-step5-log`)

### 5.1 Backend: log endpoint — status: todo
- Goal: `GET /api/log` → weeks newest first: `{ weekStart, count, note, cards[] }`. A direct read query loads completed cards; a pure function groups them with `week_of(completed_at, tz)` (D1=B).
- Files: `src/modules/weeks/*`
- Acceptance: `curl` with cards completed at 23:30 Sunday and 00:30 Monday Rome time land in different weeks.

### 5.2 Front-end: log page with markdown copy — status: todo
- Goal: a "Log" view reachable from the header; each week shows count, note and cards; "Copy as markdown" button copies title line (`Week 45 · 3–9 Nov`), the note and a bullet list.
- A pure function `weekToMarkdown(week)` in `utils/helpers.ts`.
- Files: new `components/WeeklyLog/*`, `App.tsx`, `utils/helpers.ts`
- Acceptance: browser check; pasted markdown reviewed.

## Risks and open points

- **Waiting import vs transition rule** (4.1): imported Waiting cards have no `waiting_on`. The first review shows them as "Still waiting" with an empty name. Acceptable per spec.
- **Existing `blocked` rows** have `waiting_on = NULL` after step 1. Same display rule.
- **Front-end has no tests.** Browser checks are the only front-end verification. I will use the Chrome tools for screenshots and console logs, as your rules ask.
- **Sizes.** Steps 2 and 3 are large. If a step grows beyond the items above, I stop and report instead of widening scope.

## Decision log

- **D1 = B.** Week logic is in pure Rust with the `chrono-tz` crate (new dependency, approved by the user). `week_start(now, tz)` and `week_of(instant, tz)` are pure functions with unit tests. SQL stores and compares plain dates and instants only.
- **D2 = A.** `apply_status` is a pure function in `src/modules/todos/transitions.rs`.
- **D3 = A.** The Trello import takes a JSON body.
