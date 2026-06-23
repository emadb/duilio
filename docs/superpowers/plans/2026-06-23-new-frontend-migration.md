# New Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Tailwind/Radix front-end with the new EUI Borealis front-end, wired to the real Rust backend API (Bearer-token auth, `/api/todos`, `/api/tags`).

**Architecture:** All source files from `new-frontend/src/` move into `front-end/src/`. The build infrastructure (`vite.config.ts`, `Dockerfile`, build output to `../static-assets/`) stays in `front-end/`. A completely rewritten `api.ts` adapts the new frontend's contract to the real backend — every other component is copied verbatim.

**Tech Stack:** React 18, TypeScript, Elastic UI (`@elastic/eui` + `@elastic/eui-theme-borealis`), Vite 5, `@emotion/react`, `@emotion/css`.

## Global Constraints

- Backend is **never modified** — frontend adapts to the existing API.
- All API calls go to `/api/*` (proxied to `http://localhost:3000` in dev; same origin in prod).
- Bearer token stored in `localStorage('auth_token')`.
- Tag colors are set at tag-creation time via the backend `Tag.color` hex field. `saveTagColors` is localStorage-only (no backend endpoint exists).
- `createdAt` is synthesised (not returned by backend) — preserve backend ordering by using `Date.now() - index`.
- Do **not** add EUI component imports for the auth modal — use plain HTML + EUI CSS variables for styling consistency (same approach used throughout the new-frontend codebase).

---

### Task 1: Update build infrastructure

**Files:**
- Modify: `front-end/package.json`
- Modify: `front-end/vite.config.ts`
- Modify: `front-end/tsconfig.json`

**Interfaces:**
- Produces: a Vite project that can `npm install` and has EUI as a dependency.

- [ ] **Step 1: Replace `front-end/package.json`**

```json
{
  "name": "front-end",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "dev": "vite"
  },
  "dependencies": {
    "@elastic/eui": "^97.0.0",
    "@elastic/eui-theme-borealis": "^1.0.0",
    "@emotion/css": "^11.13.0",
    "@emotion/react": "^11.13.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Replace `front-end/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static-assets',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 3: Replace `front-end/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Run `npm install` in `front-end/`**

```bash
cd front-end && npm install
```

Expected: installs EUI and dependencies with no errors.

- [ ] **Step 5: Commit**

```bash
git add front-end/package.json front-end/vite.config.ts front-end/tsconfig.json front-end/package-lock.json
git commit -m "chore: swap front-end deps to EUI, update vite config and tsconfig"
```

---

### Task 2: Migrate source files

Replace all of `front-end/src/` with `new-frontend/src/`. The stub `api.ts` is carried over as-is here — it will be rewritten in Task 3.

**Files:**
- Delete: everything under `front-end/src/` (old Tailwind/Radix code)
- Create: `front-end/src/` populated from `new-frontend/src/`

**Interfaces:**
- Produces: `front-end/src/` with the full EUI component tree, stub api, and all types in place.

- [ ] **Step 1: Delete old source tree**

```bash
rm -rf front-end/src
```

- [ ] **Step 2: Copy new source tree**

```bash
cp -r new-frontend/src front-end/src
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd front-end && npm run typecheck
```

Expected: exits 0. (The stub `api.ts` uses localStorage — it will type-check fine.)

- [ ] **Step 4: Commit**

```bash
git add front-end/src
git commit -m "feat: migrate new EUI frontend source files"
```

---

### Task 3: Rewrite `api.ts` as real backend adapter

This is the core of the migration. Completely replace `front-end/src/services/api.ts` with a real HTTP adapter that maps the new-frontend's contract to the Rust backend.

**Backend types returned:**
```
BackendTag  { id: string; name: string; color: string }
BackendTodo { id: string; title: string; description: string; dueDate: string | null;
              status: 'todo'|'in-progress'|'done'; tags: BackendTag[] }
LoginRes    { token: string; user: { id: string; email: string } }
```

**Backend endpoints consumed:**
- `POST /api/auth/login`    body: `{email, password}` → `LoginRes`
- `POST /api/auth/register` body: `{email, password}` → `{id, email, createdAt}`
- `GET  /api/todos`         → `BackendTodo[]` (ordered by `created_at DESC`)
- `POST /api/todos`         body: `{title, description, dueDate?, status?, tagIds: string[]}` → `BackendTodo`
- `PATCH /api/todos/:id`    body: partial of above → `BackendTodo`
- `DELETE /api/todos/:id`   → 204
- `GET  /api/tags`          → `BackendTag[]`
- `POST /api/tags`          body: `{name, color}` → `BackendTag`

**Files:**
- Modify: `front-end/src/services/api.ts`

**Interfaces:**
- Consumes: `Task`, `TagColorMap` from `../types/task`; `TAG_COLORS` from `../constants`; `autoColorIndex` from `../utils/helpers`
- Produces (exported):
  - `fetchTasks(): Promise<Task[]>`
  - `createTask(data: Omit<Task, 'id'|'createdAt'>): Promise<Task>`
  - `updateTask(id: string, data: Partial<Omit<Task, 'id'|'createdAt'>>): Promise<Task>`
  - `deleteTask(id: string): Promise<void>`
  - `fetchTagColors(): Promise<TagColorMap>`
  - `saveTagColors(map: TagColorMap): Promise<TagColorMap>`
  - `login(email: string, password: string): Promise<void>`
  - `register(email: string, password: string): Promise<void>`
  - `logout(): void`
  - `setAuthToken(token: string | null): void`

- [ ] **Step 1: Write the new `front-end/src/services/api.ts`**

```ts
import type { Task, TagColorMap } from '../types/task';
import { TAG_COLORS } from '../constants';
import { autoColorIndex } from '../utils/helpers';

// ── Auth state ────────────────────────────────────────────────────────────────

let _authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null): void {
  _authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

// ── Tag cache (name → BackendTag) ─────────────────────────────────────────────

interface BackendTag {
  id: string;
  name: string;
  color: string;
}

const _tagCache = new Map<string, BackendTag>();

// ── Backend shapes ────────────────────────────────────────────────────────────

interface BackendTodo {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: 'todo' | 'in-progress' | 'done';
  tags: BackendTag[];
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers as HeadersInit);
  if (_authToken) headers.set('Authorization', `Bearer ${_authToken}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`/api${path}`, { ...init, headers });

  if (!res.ok) {
    if (res.status === 401) setAuthToken(null);
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* non-JSON body */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Data mapping ──────────────────────────────────────────────────────────────

function extractDate(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10); // "2026-06-21T00:00:00Z" → "2026-06-21"
}

function todoToTask(todo: BackendTodo, index: number): Task {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    dueDate: extractDate(todo.dueDate),
    tags: todo.tags.map((t) => t.name),
    createdAt: Date.now() - index, // preserve backend DESC order
  };
}

// ── Tag helpers ───────────────────────────────────────────────────────────────

async function ensureTag(name: string, colorIndex: number): Promise<string> {
  const cached = _tagCache.get(name);
  if (cached) return cached.id;

  const color = TAG_COLORS[colorIndex % TAG_COLORS.length].dot;
  try {
    const tag = await request<BackendTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    _tagCache.set(name, tag);
    return tag.id;
  } catch {
    // Tag already exists for this user — refetch to populate cache
    const tags = await request<BackendTag[]>('/tags');
    tags.forEach((t) => _tagCache.set(t.name, t));
    const found = _tagCache.get(name);
    if (!found) throw new Error(`Tag "${name}" could not be created or found`);
    return found.id;
  }
}

// ── Task endpoints ────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const todos = await request<BackendTodo[]>('/todos');
  return todos.map(todoToTask);
}

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt'>,
): Promise<Task> {
  const tagIds = await Promise.all(data.tags.map((name) => ensureTag(name, 0)));
  const todo = await request<BackendTodo>('/todos', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate || null,
      status: data.status,
      tagIds,
    }),
  });
  return todoToTask(todo, 0);
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>,
): Promise<Task> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.status !== undefined) body.status = data.status;
  if (data.dueDate !== undefined) body.dueDate = data.dueDate || null;
  if (data.tags !== undefined) {
    body.tagIds = await Promise.all(data.tags.map((name) => ensureTag(name, 0)));
  }

  const todo = await request<BackendTodo>(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return todoToTask(todo, 0);
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/todos/${id}`, { method: 'DELETE' });
}

// ── Tag color endpoints ───────────────────────────────────────────────────────

export async function fetchTagColors(): Promise<TagColorMap> {
  const tags = await request<BackendTag[]>('/tags');
  tags.forEach((t) => _tagCache.set(t.name, t));

  // Derive color index from the hex stored on each tag
  const backendMap: TagColorMap = {};
  tags.forEach((tag) => {
    const idx = TAG_COLORS.findIndex(
      (c) => c.dot.toLowerCase() === tag.color.toLowerCase(),
    );
    backendMap[tag.name] = idx >= 0 ? idx : autoColorIndex(tag.name);
  });

  // Merge with localStorage overrides (from assignTagColor)
  try {
    const saved = JSON.parse(localStorage.getItem('tm_tagColors') || 'null') as TagColorMap | null;
    if (saved) return { ...backendMap, ...saved };
  } catch { /* ignore */ }

  return backendMap;
}

export async function saveTagColors(map: TagColorMap): Promise<TagColorMap> {
  localStorage.setItem('tm_tagColors', JSON.stringify(map));
  return map;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<void> {
  const res = await request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(res.token);
}

export async function register(email: string, password: string): Promise<void> {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): void {
  setAuthToken(null);
  _tagCache.clear();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd front-end && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add front-end/src/services/api.ts
git commit -m "feat: wire api.ts to real backend (todos, tags, auth)"
```

---

### Task 4: Create AuthModal

New component that gates the app behind login. Built with plain HTML elements and EUI CSS variables — same style approach as the rest of the new-frontend codebase.

**Files:**
- Create: `front-end/src/components/AuthModal/AuthModal.tsx`

**Interfaces:**
- Consumes: `login(email, password)`, `register(email, password)` from `../../services/api`
- Produces: `AuthModal` component with props `{ onSuccess: () => void }`

- [ ] **Step 1: Create `front-end/src/components/AuthModal/AuthModal.tsx`**

```tsx
import React, { useState } from 'react';
import { login, register } from '../../services/api';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password);
        setMode('login');
        setPassword('');
        return;
      }
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--eui-page-background)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--eui-bg-plain)',
          border: '1px solid var(--eui-border-color)',
          borderRadius: 'var(--eui-border-radius-large)',
          padding: 32,
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <svg
            width={40}
            height={40}
            viewBox="0 0 16 16"
            fill="var(--eui-color-primary)"
            style={{ marginBottom: 12 }}
          >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
          </svg>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--eui-title-color)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            Duilio
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 13,
              color: 'var(--eui-text-subdued)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 16,
              background: 'var(--eui-bg-base-danger)',
              border: '1px solid var(--eui-border-color-danger)',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--eui-text-danger)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading
              ? 'Please wait…'
              : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            style={linkButtonStyle}
          >
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--eui-text-color)',
  fontFamily: 'var(--eui-font-family)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  border: '1px solid var(--eui-form-border-color)',
  borderRadius: 'var(--eui-border-radius-medium)',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  color: 'var(--eui-text-color)',
  background: 'var(--eui-form-background)',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 16px',
  border: 'none',
  borderRadius: 6,
  background: 'var(--eui-color-primary)',
  color: '#fff',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--eui-color-primary)',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'underline',
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd front-end && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add front-end/src/components/AuthModal/AuthModal.tsx
git commit -m "feat: add EUI-styled AuthModal (login/register)"
```

---

### Task 5: Add auth gate to App and logout button to AppHeader

Wire `AuthModal` into `App.tsx` as a gate. Detect 401 errors from `useTasks` and drop back to the auth screen. Add a logout button to `AppHeader`.

**Files:**
- Modify: `front-end/src/App.tsx`
- Modify: `front-end/src/components/AppHeader/AppHeader.tsx`
- Modify: `front-end/src/hooks/useTasks.ts`

**Interfaces:**
- Consumes: `AuthModal` from `./components/AuthModal/AuthModal`; `logout` from `./services/api`
- `AppHeader` gains optional prop `onLogout?: () => void`
- `useTasks` gains optional param `onUnauthorized?: () => void` — called when a 401 is received so App can show the auth screen

- [ ] **Step 1: Add `onUnauthorized` callback to `useTasks.ts`**

Replace the `useTasks` function signature and the catch block in `front-end/src/hooks/useTasks.ts`:

```ts
export function useTasks(onUnauthorized?: () => void): UseTasksReturn {
```

Replace the existing `catch (e)` block inside the `useEffect`:

```ts
      } catch (e) {
        if (!cancelled) {
          const msg = (e as Error).message;
          if (msg.includes('401') && onUnauthorized) {
            onUnauthorized();
          } else {
            setError('Failed to load tasks.');
          }
        }
```

- [ ] **Step 2: Add `onLogout` prop to `AppHeader`**

In `front-end/src/components/AppHeader/AppHeader.tsx`, add `onLogout` to the interface and render a logout button after the "Create task" button:

```ts
interface AppHeaderProps {
  tasks: Task[];
  search: string;
  onSearch: (value: string) => void;
  activeStatuses: TaskStatus[];
  onToggleStatus: (status: TaskStatus) => void;
  layout: 'grid' | 'list';
  onToggleLayout: () => void;
  onCreateTask: () => void;
  onLogout: () => void;
}
```

Add the logout button inside the `{/* Layout toggle + Create */}` `<div>`, after the "Create task" button:

```tsx
        <button
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            border: '1px solid var(--eui-border-color)',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--eui-text-subdued)',
            transition: 'background 0.1s ease',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              'var(--eui-bg-interactive-hover)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'transparent')
          }
        >
          <LogoutIcon />
        </button>
```

Add the `LogoutIcon` SVG alongside `GridIcon` and `ListIcon` at the bottom of the file:

```tsx
const LogoutIcon = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"
    />
    <path
      fillRule="evenodd"
      d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"
    />
  </svg>
);
```

- [ ] **Step 3: Rewrite `front-end/src/App.tsx` with the auth gate**

```tsx
import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader/AppHeader';
import { SummaryBar } from './components/SummaryBar/SummaryBar';
import { StatusSection } from './components/StatusSection/StatusSection';
import { TaskModal } from './components/TaskModal/TaskModal';
import { ConfirmDelete } from './components/ConfirmDelete/ConfirmDelete';
import { AuthModal } from './components/AuthModal/AuthModal';
import { useTasks } from './hooks/useTasks';
import { logout } from './services/api';
import { STATUSES } from './constants';
import type { Task, TaskStatus } from './types/task';

type Layout = 'grid' | 'list';
const DEFAULT_COLUMNS = 3;

// ── Auth gate ─────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem('auth_token'),
  );

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AuthModal onSuccess={() => setIsLoggedIn(true)} />;
  }

  return <TaskApp onLogout={handleLogout} />;
};

// ── Main app (rendered only when authenticated) ───────────────────────────────

const TaskApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { tasks, tagColorMap, loading, error, addTask, editTask, removeTask, assignTagColor } =
    useTasks(onLogout); // onLogout doubles as onUnauthorized handler

  const [search, setSearch] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>([
    'todo',
    'in-progress',
    'done',
  ]);
  const [layout, setLayout] = useState<Layout>('grid');
  const [columns] = useState(DEFAULT_COLUMNS);
  const [modalTask, setModalTask] = useState<Partial<Task> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  // Auto-logout when a 401 clears the token while already on the tasks screen
  useEffect(() => {
    if (error && !localStorage.getItem('auth_token')) {
      onLogout();
    }
  }, [error, onLogout]);

  function toggleStatus(value: TaskStatus) {
    setActiveStatuses((prev) =>
      prev.includes(value)
        ? prev.length > 1
          ? prev.filter((s) => s !== value)
          : prev
        : [...prev, value],
    );
  }

  function openCreate(defaultStatus: string = 'todo') {
    setModalTask({ status: defaultStatus as TaskStatus, tags: [] });
  }

  function openEdit(task: Task) {
    setModalTask(task);
  }

  async function handleSave(data: Omit<Task, 'id' | 'createdAt'>) {
    if (modalTask?.id) {
      await editTask(modalTask.id, data);
    } else {
      await addTask(data);
    }
    setModalTask(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeTask(deleteTarget.id);
    setDeleteTarget(null);
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      )
    : tasks;

  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s.value, filtered.filter((t) => t.status === s.value)]),
  ) as Record<TaskStatus, Task[]>;

  const noResults = q.length > 0 && filtered.length === 0;

  if (loading) {
    return (
      <div style={centeredStyle}>
        <Spinner />
        <p style={subtleText}>Loading tasks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centeredStyle}>
        <p style={{ ...subtleText, color: 'var(--eui-text-danger)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eui-page-background)' }}>
      <AppHeader
        tasks={tasks}
        search={search}
        onSearch={setSearch}
        activeStatuses={activeStatuses}
        onToggleStatus={toggleStatus}
        layout={layout}
        onToggleLayout={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
        onCreateTask={() => openCreate()}
        onLogout={onLogout}
      />

      <main
        style={{
          maxWidth: layout === 'grid' ? 1400 : 740,
          margin: '0 auto',
          padding: '28px 24px 60px',
          transition: 'max-width 0.2s ease',
        }}
      >
        <SummaryBar tasks={tasks} />

        {noResults ? (
          <div style={{ textAlign: 'center', padding: '52px 0' }}>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--eui-title-color)',
                fontFamily: 'var(--eui-font-family)',
              }}
            >
              No results for "{search}"
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--eui-text-subdued)',
                fontFamily: 'var(--eui-font-family)',
              }}
            >
              Try a different search term or tag.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {STATUSES.filter((s) => activeStatuses.includes(s.value)).map((s) => (
              <StatusSection
                key={s.value}
                status={s}
                tasks={byStatus[s.value] ?? []}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAdd={openCreate}
                layout={layout}
                columns={columns}
                tagColorMap={tagColorMap}
              />
            ))}
          </div>
        )}
      </main>

      {modalTask !== null && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onClose={() => setModalTask(null)}
          tagColorMap={tagColorMap}
          onColorAssign={assignTagColor}
        />
      )}
      {deleteTarget !== null && (
        <ConfirmDelete
          task={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

const centeredStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--eui-page-background)',
  gap: 12,
};

const subtleText: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: 'var(--eui-text-subdued)',
  fontFamily: 'var(--eui-font-family)',
};

const Spinner = () => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 32 32"
    fill="none"
    style={{ animation: 'spin 0.8s linear infinite' }}
  >
    <circle cx="16" cy="16" r="12" stroke="var(--eui-border-color)" strokeWidth="3" />
    <path
      d="M16 4a12 12 0 0 1 12 12"
      stroke="var(--eui-color-primary)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd front-end && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add front-end/src/App.tsx \
        front-end/src/components/AppHeader/AppHeader.tsx \
        front-end/src/hooks/useTasks.ts
git commit -m "feat: add auth gate, logout button, 401 auto-redirect"
```

---

### Task 6: End-to-end verification

Run the dev server against the real backend and exercise every feature.

**Files:** none — verification only.

- [ ] **Step 1: Start the backend**

```bash
# in the repo root
cargo run
```

Expected: `Listening on 0.0.0.0:3000`

- [ ] **Step 2: Start the frontend dev server**

```bash
cd front-end && npm run dev
```

Expected: `Local: http://localhost:5173/`

- [ ] **Step 3: Register a new account**

Open `http://localhost:5173`. Click "Register", enter email + password (≥ 6 chars), submit. Expected: switches to login mode.

- [ ] **Step 4: Log in**

Enter same credentials, submit. Expected: auth screen disappears, task board loads (empty).

- [ ] **Step 5: Create a task with a tag**

Click "Create task". Fill in title, add a tag (e.g. `bug`). Save. Expected: task appears in "To Do" column; tag pill rendered.

- [ ] **Step 6: Edit and change status**

Click the task card to open edit modal. Change status to "In Progress". Save. Expected: task moves to the "In Progress" section.

- [ ] **Step 7: Delete a task**

Click the delete icon, confirm. Expected: task is removed.

- [ ] **Step 8: Log out and back in**

Click the logout button (→ icon in header). Expected: auth screen reappears. Log back in. Expected: previously created tasks load correctly (persisted in DB).

- [ ] **Step 9: Verify production build**

```bash
cd front-end && npm run build
```

Expected: `../static-assets/` is populated with the built assets, exits 0.

- [ ] **Step 10: Remove new-frontend directory and commit**

```bash
rm -rf new-frontend
git add -A
git commit -m "chore: remove new-frontend scaffold (migrated to front-end/)"
```
