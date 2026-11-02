# Code review — full code base and database

Date: 2026-11-02. Scope: Rust backend (`src/`), migrations and the live schema, React front-end (`front-end/src/`), Dockerfile, Kamal config, CI.
Method: three independent read-only reviews (backend security, database and backend performance, front-end). I re-checked the findings marked **verified** with a running server on a throwaway database, a query on the schema, or the library source. Nothing in the code was changed by this review. Only `CLAUDE.md` and `README.md` were corrected.

Status values: `todo`, `doing`, `done`, `blocked`. Effort: S (under 1 hour), M (half a day), L (a day or more).

## Summary

The code base is in good shape. Business rules are pure functions with tests (59 tests). Every query filters by the user id. All SQL uses parameters. There is no XSS path in the front-end. Review completion is atomic and safe against a double submit.

The main weak points:
1. **Login rate limit can be bypassed** with a fake `X-Forwarded-For` header (verified).
2. **Editing "blocked by" or the return week of a card does nothing** (verified). This is a user-visible bug.
3. **Registration accepts an empty email and password** (verified), and anyone can register.
4. **The database has no index except primary keys** (verified). It is fine today, it will not be at thousands of cards.
5. **The board loads the whole history** of done cards on every page load.
6. **Several error paths show nothing to the user** (expired session, failed save).

## Items

### A. Security and correctness (do first)

#### A1. Login rate limit can be bypassed — High, S — status: todo
- Evidence (**verified**): `auth/router.rs:121` uses `SmartIpKeyExtractor`, which trusts `X-Forwarded-For`. 14 login attempts with a different fake header each all returned 401. The same 14 attempts without the header were limited (429 after 7).
- Not verified: whether the Kamal proxy overwrites that header. If it only appends, the left-most value is still chosen by the client.
- Fix: key on the last `X-Forwarded-For` value (the one the proxy adds), or on the peer address when there is no proxy. Add a test with two fake headers.
- Files: `src/modules/auth/router.rs`.

#### A2. Editing "blocked by" or the return week is ignored — High, S — status: done
- Evidence (**verified**): `PATCH /api/todos/:id` with `{"status":"blocked","waitingOn":"Anna"}` on a card that is already blocked by "Marco" returns 200 and keeps "Marco". `apply_status` returns early when the status is the same (`todos/transitions.rs`). The task modal always sends the status, so the field cannot be changed from the UI. The same happens to `pausedUntil`.
- Fix: when the status is the same and `waitingOn` or `pausedUntil` is sent, validate it and update it (and `waiting_since` only when the name changes). Add unit tests.
- Files: `src/modules/todos/transitions.rs`, tests.
- Done: a card that keeps its status now takes a new `waitingOn` or `pausedUntil`. A new person restarts `waiting_since`; the same name changes nothing. A blank name or a non-Monday returns 400.

#### A3. Registration accepts an empty email and password — High, S — status: doing
- Evidence (**verified**): `POST /api/auth/register` with `{"email":"","password":""}` returns 201. Anyone can register (open registration). Emails are case sensitive, so `A@x.com` and `a@x.com` are two users (the unique index is on `email`). Register says "User already exists", so it tells which emails exist.
- Fix: check email format (basic) and password length (8 to 72 bytes), lower-case the email, add `CREATE UNIQUE INDEX ... ON users (lower(email))` in a new migration. Decide if registration stays open: add an env flag `REGISTRATION_OPEN` (default off in production).
- Note: a password longer than 72 bytes is **cut silently** by bcrypt (checked in the crate source). It does not panic, as one reviewer claimed.
- Files: `src/modules/auth/*`, new migration, `config.rs`.
- Done (partly): the API now requires an email with a valid shape and a password of 6 to 72 bytes (same minimum as the form), and trims the email. Still open: the case-insensitive unique index, the open-registration flag, and the "User already exists" answer that shows which emails exist.

#### A4. Database errors reach the client — Medium, M — status: todo
- Evidence: `internal_server_error(e.to_string())` in every router. A constraint or connection error shows table and constraint names in the JSON message.
- Fix: one `AppError` enum with `IntoResponse`. Log the detail on the server. Send a fixed message. This also removes the mix of `SaveError`, `CompleteError`, `Option` and bare `sqlx::Error`.
- Files: `src/modules/mod.rs` and all routers.

#### A5. Duplicate tag returns 500 — Medium, S — status: todo
- Evidence (**verified**): creating the same tag twice returns `500 {"message":"Tag \"a\" already exists"}`. The check and the insert are two steps, so a race gives a raw unique-violation error.
- Fix: `INSERT ... ON CONFLICT DO NOTHING RETURNING`, answer 409. The front-end matches the text `already exists` (`api.ts:161`): switch it to the status code.
- Files: `tags/repository.rs`, `tags/router.rs`, `front-end/src/services/api.ts`.

#### A6. Todo create and update are not atomic — Medium, M — status: todo
- Evidence: `update` reads the row, computes in Rust and writes with no lock (`todos/repository.rs`). Tags are synced with a separate delete and insert on the pool. Two writes at once (drag and drop plus a modal save, or two tabs) can overwrite each other. A failure between delete and insert leaves a card without tags.
- Fix: one transaction with `SELECT ... FOR UPDATE`, as the review completion already does.
- Files: `src/modules/todos/repository.rs`.

#### A7. Input limits are missing — Medium, M — status: todo
- Evidence: no maximum length for title, description, tag name, `waiting_on`, note. `tagIds` and review `decisions` have no cap. `plan_review` searches the decisions once per card (quadratic). The import accepts 20 MB and has no cap on cards, and a few imports at once use all 5 pool connections. An empty title is accepted.
- Fix: limits and trimming in the routers, caps on lists, a limit on import size and cards. Optional `CHECK (char_length(...))` in a new migration.
- Files: routers of todos, tags, weeks, import; new migration.

#### A8. Small hardening — Low, S — status: todo
- Token without `Bearer ` is accepted (**verified**, `auth_middleware.rs:62`). Require the prefix.
- An unknown `/api/...` path returns 200 and the HTML page (**verified**). Return 404 JSON.
- `DATABASE_URL` falls back to a local default also in production (`config.rs`). Make it required when `APP_ENV=production`.
- No security headers (`X-Content-Type-Options`, `Referrer-Policy`, a CSP). Add them with a tower-http layer.
- JWT: a deleted user's token stays valid up to 7 days. Reads return empty and some endpoints return 500. Acceptable for now. Optional: check that the user exists.
- bcrypt runs inside async handlers and blocks a worker. Use `spawn_blocking`. Login for an unknown email is faster than for a known one (timing shows which emails exist): verify against a dummy hash. Cost 10 is the minimum today: use 12.
- Files: `auth_middleware.rs`, `main.rs`, `config.rs`, `auth/*`.

#### A9. Deployment exposure (not verified) — Medium, S — status: todo
- `config/deploy.yml` publishes the Postgres accessory with `port: 5432`. Kamal publishes it on all interfaces. If the VPS firewall allows 5432, the database is reachable from the internet. I could not check the firewall.
- Check: `nc -zv <host> 5432` from outside. Fix: publish only on `127.0.0.1` (`port: "127.0.0.1:5432:5432"`) or not at all, since the app reaches it through the Docker network `duilio`.

### B. Front-end bugs and robustness

#### B1. Session expiry in the middle of a session — High, M — status: todo
- Evidence (**verified**): only the first loads call `onUnauthorized`. Later calls end in `.catch(console.error)`. After the token expires (7 days), a drag and drop snaps back and nothing is shown, and every action keeps failing until a reload.
- Fix: one global 401 handler in `request()` that logs out, and a small error message (toast) for failed actions.
- Files: `services/api.ts`, `App.tsx`, `useTasks.ts`.

#### B2. Task modal: no error message, no double-click guard — High, S — status: todo
- Evidence (**verified**): `onSave` is typed `void`, `handleSave` can reject, the modal stays open with no message, and the Save button is never disabled. Two clicks create two cards. `ConfirmDelete` has the same problem.
- Fix: `saving` state, `await` in the modal, an error line (as the review screen does).
- Files: `TaskModal.tsx`, `ConfirmDelete.tsx`, `App.tsx`.

#### B3. Tag colors in `localStorage` are shared between users — Medium, S — status: todo
- Evidence: the key `tm_tagColors` is global and is not cleared on logout. User B on the same browser can have A's colors pushed to B's tags with the same name (the sync I added only runs for tags at the default color, which limits the damage).
- Fix: clear the key on logout, or key it by user id. Better: remove the local copy once the pick is passed to the API call directly.
- Files: `services/api.ts`.

#### B4. Optimistic update rollback is partial — Medium, S — status: todo
- Evidence: `moveTask` restores only `status` and keeps the optimistic `waitingOn` or `pausedUntil`. The server answer replaces the whole card, so a concurrent change of the flag can be lost. `toggleImportant` reads `tasks` from the closure.
- Also: a new card is added at the end of the column while the server lists newest first (position jumps after a reload). `updateTask` skips empty `waitingOn` and `pausedUntil`, so they cannot be cleared.
- Fix: keep a snapshot of the previous card and restore it. Merge only server-owned fields. Read from `tasksRef`.
- Files: `useTasks.ts`, `services/api.ts`.

#### B5. A failed first load has no way out — Medium, S — status: todo
- A 500 or a network error shows only a message. No retry, no logout. Add a "Try again" and a "Log out" button.
- Files: `App.tsx`.

#### B6. Accessibility — Medium, M — status: todo
- The card title is a `span` with a click handler: no keyboard access. Modals have no `role="dialog"`, no focus trap and no focus restore. Labels are not tied to inputs (`htmlFor`). Drag and drop is the only quick way to change status (the edit modal works with the keyboard).
- Files: `TaskCard.tsx`, the four modal components, `AuthModal.tsx`, `StatusFields.tsx`.

#### B7. Small front-end items — Low, S — status: todo
- Markdown images from other sites load in cards. No XSS (scripts and `javascript:` links are blocked), but an image can leak that a card was opened. Option: `disallowedElements={['img']}`.
- `TrelloImport` re-subscribes the Escape handler on every render. `WeeklyLog` has no unmount guard on its fetch.
- The fallback week (`App.tsx:95`) is a UTC date, not a Monday. It is used only if the week did not load.

### C. Performance and weight

#### C1. Add database indexes — High (later), S — status: todo
- Evidence (**verified** on the schema): the only indexes are primary keys and two unique constraints. `todos` has no index on `user_id`. `todo_tags` has none on `tag_id` (deleting a tag scans the table).
- Fix (new migration):
  ```sql
  CREATE INDEX todos_user_status_idx ON todos (user_id, status);
  CREATE INDEX todos_user_done_idx ON todos (user_id, completed_at DESC) WHERE status = 'done';
  CREATE INDEX todo_tags_tag_id_idx ON todo_tags (tag_id);
  ```
- Today the tables are small, so this is for the future. It is cheap and safe.

#### C2. The board loads the whole history — Medium, M — status: todo
- Evidence: `GET /api/todos` returns every card, including all done cards of all weeks, with descriptions. The front-end then hides the old done cards. `GET /api/log` also loads the whole done history.
- Fix: load only open cards and the done cards of the current week for the board. Add paging to the log (for example 12 weeks, "load more").
- Files: `todos/repository.rs`, `todos/router.rs`, `weeks/repository.rs`, `WeeklyLog.tsx`.

#### C3. Remove unused front-end dependencies — Medium, S — status: todo
- Evidence (**verified**): `@elastic/eui`, `@elastic/eui-theme-borealis`, `@emotion/css` and `@emotion/react` are in `front-end/package.json`, and no file in `src/` imports them. `npm audit --omit=dev` reports moderate findings that come from this tree. There is also an unused `postcss.config.mjs`, and extra packages (Tailwind, Radix and others) in the root `node_modules`.
- Fix: remove the four dependencies and the PostCSS file, run `npm install`, rebuild. It makes `npm ci` and the Docker build faster. The `--eui-*` variable names can stay (they are plain CSS variables), or be renamed later.
- The bundle is 367 KB (111 KB gzip). I did not run a bundle analyzer.
- Files: `front-end/package.json`, `package-lock.json`.

#### C4. The whole board re-renders on every keystroke in search — Low/Medium, S — status: todo
- Evidence: the filter and sort run in `TaskApp` on every render, and cards are not memoized. Each card parses its markdown again. Not an issue with tens of cards. It will show with hundreds.
- Fix: `useMemo` for the columns, `React.memo` for `TaskCard`, a short debounce on the search field.
- Files: `App.tsx`, `TaskCard.tsx`.

#### C5. Backend round trips — Low, M — status: todo
- `current()` runs 3 queries on each call (time zone, insert, select). It can be one. `create` and `update` run 3 to 5 queries. Review completion runs one statement per card (fine for tens of cards). Import inserts one row at a time (fine for a one-time import).
- Files: `weeks/repository.rs`, `todos/repository.rs`.

### D. Maintainability

#### D1. Duplicated SQL column list and long argument lists — Medium, M — status: todo
- The 12-column todo `SELECT` is written 6 times. `create` and `update` take 8 and 9 arguments (two `#[allow(clippy::too_many_arguments)]`).
- Fix: `NewTodo` and `TodoPatch` structs, one shared query for the row. Do together with A6.
- Files: `todos/repository.rs`, `weeks/repository.rs`, `todos/router.rs`.

#### D2. No tests for SQL and transactions — Medium, M — status: todo
- Pure functions are well covered. The repository code is not: review completion, update, tag duplicates, register. There are no tests for `auth`.
- Fix: a few `#[sqlx::test]` integration tests. CI already has the Postgres service. Add them for A2, A3, A5 and A6 as you fix those.

#### D3. Database leftovers and rules — Low, S — status: todo
- `todos.status` defaults to `'todo'` in the database, and to `idea` in the application. Align or drop the default.
- `CREATE EXTENSION "uuid-ossp"` is not needed (the code uses `gen_random_uuid()`).
- Users cannot change their time zone: there is no API for `users.timezone`, so everyone gets Rome weeks. This is a product gap. Decide if it is needed.
- No check that `completed_at` and `waiting_on` match the status. Do not add one for `waiting_on`: the import creates blocked cards without it.

#### D4. Startup and pool — Low, S — status: todo
- `connect().expect(...)` and `migrate(...).unwrap()` panic with an unreadable message when the database is down. The container then restarts in a loop. Add a few retries and a clear message.

#### D5. Front-end structure — Low, M — status: todo
- Inline style objects and button styles repeat in many components. `TaskModal` (367 lines) and `TaskCard` (263 lines) are large. `useIsMobile` exists twice. Hover effects mutate `style` in event handlers (CSS classes would be simpler).
- Dead code: `uid()` in `helpers.ts`, `countBg` and `countFg` in `STATUSES` and `StatusMeta`, `createdAt` on `Task`.
- Poppins loads from Google Fonts (a request to a third party, and no font offline). Option: self-host with `@fontsource/poppins` (needs your approval for the new package).

## Checked and fine

- Every query on todos, tags, weeks and `todo_tags` filters by the user id. The tag-attach path drops tag ids of other users.
- All `/api` routes except auth and `/health` are behind the JWT middleware. Bad tokens return 401 and never panic.
- SQL uses parameters everywhere. No string-built SQL.
- Review completion: one transaction, `FOR UPDATE` on the week and the cards, 409 on a second submit.
- Week creation is safe against races (`ON CONFLICT DO NOTHING`). Time zone and DST logic are tested.
- Tag lookups are batched (no N+1). Foreign keys and cascades are correct. All timestamps are `timestamptz`.
- No `dangerouslySetInnerHTML`, `innerHTML` or `eval` in the front-end. Markdown does not render raw HTML.
- The Docker image runs as a non-root user. Migrations are ordered, and the `ADD VALUE` migration is safe.

## Not verified or corrected

- Reviewer claim not confirmed: "a very long password makes `bcrypt::hash` panic". The crate cuts it at 72 bytes. No panic.
- Not checked: Kamal proxy headers (A1), the firewall (A9), the bundle contents (C3), real render time with hundreds of cards (C4), `cargo audit` (not installed; Cargo.lock versions look current).
- The reviews were read-only. I did not run load tests.

## Suggested order

1. A2, A3, A5, B1, B2 (bugs a user can hit).
2. A1, A8, A9 (security).
3. C1, C3 (cheap, safe).
4. A4, A6, A7, D1, D2 together (error type, transactions, limits, tests).
5. C2, B3 to B7, then the rest as needed.
