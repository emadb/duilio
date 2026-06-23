# New Frontend Migration Design

**Date:** 2026-06-23  
**Status:** Approved

## Overview

Replace the current `front-end/` React app (Tailwind + Radix UI) with the new `new-frontend/` app (Elastic UI / EUI Borealis). The new frontend has richer UX but uses stub API calls. This migration wires it to the real Rust backend without changing the backend at all.

## Approach

Move all of `new-frontend/src/` into `front-end/src/`, keeping the existing build infrastructure (Dockerfile, vite output to `../static-assets/`, dev proxy). All backend adaptation happens in the service layer (`src/services/api.ts`).

## File Migration

- `new-frontend/src/*` → `front-end/src/*` (replaces all existing source files)
- `new-frontend/` can be removed after migration
- `front-end/` keeps its role as the build project

## Build Infrastructure

**`front-end/package.json`:**
- Remove: Tailwind, Radix UI, shadcn, sonner, react-hook-form, lucide-react, next-themes
- Add: `@elastic/eui`, `@elastic/eui-theme-borealis`, `@emotion/css`, `@emotion/react`
- Keep: `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`

**`front-end/vite.config.ts`:**
- Keep `build.outDir: '../static-assets'` and `emptyOutDir: true`
- Enable proxy: `/api → http://localhost:3000`
- Remove Tailwind plugin

## API Adapter (`src/services/api.ts`)

Complete rewrite. All bridging between new-frontend's contract and the real backend happens here. Components are untouched.

### Real backend endpoints used

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | `{email, password}` → `{token, user}` |
| `POST` | `/api/auth/register` | `{email, password}` → `{id, email, createdAt}` |
| `GET` | `/api/todos` | → `Todo[]` (tags as `Tag[]` objects) |
| `POST` | `/api/todos` | `{title, description, dueDate?, status?, tagIds}` → `Todo` |
| `PATCH` | `/api/todos/:id` | partial update → `Todo` |
| `DELETE` | `/api/todos/:id` | → 204 |
| `GET` | `/api/tags` | → `Tag[]` |
| `POST` | `/api/tags` | `{name, color}` → `Tag` |

### Auth state

Bearer token in `localStorage('auth_token')`. Every request adds `Authorization: Bearer <token>`. On 401, token is cleared.

### `fetchTasks()` mapping

`GET /api/todos` → `Task[]`

- `tags: Tag[]` → `tags: string[]` (tag names only)
- `dueDate: string|null` → extract `YYYY-MM-DD` from ISO timestamp, or `""` if null
- `createdAt`: not in backend response; synthesize `Date.now() - index * 1` to preserve backend `ORDER BY created_at DESC`

### `createTask(data)` mapping

1. Resolve each tag name → tag ID via in-memory cache (see Tag Cache below)
2. `POST /api/todos` with `{ title, description, dueDate: data.dueDate || null, status, tagIds }`
3. Convert `Todo` response → `Task`

### `updateTask(id, data)` mapping

1. Resolve tags if `data.tags` is present
2. `PATCH /api/todos/:id` with adapted fields
3. Empty `dueDate` (`""`) → `null` in request body (backend clears the value)
4. Convert `Todo` response → `Task`

### `deleteTask(id)`

`DELETE /api/todos/:id` (204 response)

### `fetchTagColors()` mapping

`GET /api/tags` → `TagColorMap` (name → colorIndex)

- For each `Tag`, match `Tag.color` hex against `TAG_COLORS[i].dot`; if no match, use `tagIndex % 10`
- Also populates an in-memory tag cache: `Map<name, {id, color}>` used by create/update

### `saveTagColors(map)`

Saves to `localStorage` only. Backend has no color-map endpoint and no tag-update endpoint. Colors are re-derived from backend tags on next load.

### Tag cache and creation

In-memory `Map<tagName, {id: string, color: string}>` populated by `fetchTagColors()`.

When a tag name appears in `createTask`/`updateTask` that isn't in the cache:
1. `POST /api/tags` with `{ name, color: TAG_COLORS[assignedColorIndex].dot }`
2. On conflict (tag already exists), refetch `GET /api/tags` to get the existing ID
3. Add to cache, proceed with the task create/update

### Auth helpers exported

- `login(email, password)` → `POST /api/auth/login`, stores token
- `register(email, password)` → `POST /api/auth/register`
- `logout()` → clears token from localStorage

## AuthModal Component

**New file:** `src/components/AuthModal/AuthModal.tsx`

Built with EUI components (`EuiModal`, `EuiModalHeader`, `EuiForm`, `EuiFieldText`, `EuiFieldPassword`, `EuiButton`, `EuiCallOut`). Same logic as old modal:
- Toggle login / register mode
- Call `api.login` or `api.register`
- Call `onSuccess(token)` on successful login
- Show inline error on failure

## App.tsx Auth Gate

Add auth state: `isLoggedIn`, `authReady` (to avoid flash of unauthenticated content).

On mount:
1. Check localStorage for token
2. If present, attempt `fetchTasks()` to validate; if 401, clear token and show auth screen
3. If no token, show auth screen immediately

When not logged in: show centered landing page ("Duilio", subtitle, "Get Started" button) + `AuthModal`.

When logged in: render existing `useTasks`-powered UI. Add logout icon button to `AppHeader`.

## Data Flow

```
User → AuthModal → api.login() → localStorage(token)
                                       ↓
useTasks() → fetchTasks() → GET /api/todos → Todo[] → Task[]
           → fetchTagColors() → GET /api/tags → Tag[] → TagColorMap

addTask() → createTask() → [resolve tags] → POST /api/todos → Todo → Task
editTask() → updateTask() → [resolve tags] → PATCH /api/todos/:id → Todo → Task
removeTask() → deleteTask() → DELETE /api/todos/:id
```

## Constraints

- Backend is not modified
- No new backend endpoints are added
- Tag colors are set at tag-creation time; no update endpoint exists, so `saveTagColors()` is localStorage-only
- `createdAt` is synthesized (not returned by backend)
