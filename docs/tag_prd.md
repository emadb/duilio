# Tags Feature — PRD

## Overview

Users can create and assign colour-coded tags to their tasks. Tags act as personal labels that help classify tasks into categories or priorities. Each tag has a name and a colour drawn from a predefined palette. Tags are permanent once created and are scoped to the user who created them.

---

## Goals

- Allow users to organise tasks using free-form, colour-coded labels.
- Keep tag management lightweight — tags are created inline, no dedicated management screen needed at this stage.
- Lay the groundwork for tag-based filtering in a future version.

---

## Non-Goals (out of scope for this version)

- Filtering or searching todos by tag.
- Editing or deleting tags once created.
- Sharing tags across users.
- Free-form colour picker (palette is predefined and validated on the frontend only).
- A dedicated tag management screen.

---

## Data Model

### `tags` table

| Column       | Type                          | Notes                                      |
|--------------|-------------------------------|--------------------------------------------|
| `id`         | `uuid` PK                     | Auto-generated                             |
| `user_id`    | `uuid` FK → `users.id`        | Cascade delete                             |
| `name`       | `text` NOT NULL               | The tag label (e.g. `"urgent"`)            |
| `color`      | `text` NOT NULL               | A palette key (e.g. `"red"`, `"blue"`)     |
| `created_at` | `timestamp with time zone`    | Defaults to `now()`                        |

**Constraints**
- Unique on `(user_id, name)` — tag names must be unique per user.

### `todo_tags` join table

| Column    | Type                    | Notes                     |
|-----------|-------------------------|---------------------------|
| `todo_id` | `uuid` FK → `todos.id`  | Cascade delete             |
| `tag_id`  | `uuid` FK → `tags.id`   | Cascade delete             |

**Constraints**
- Composite primary key on `(todo_id, tag_id)`.
- On todo deletion, all associated `todo_tags` rows are deleted automatically (cascade).

---

## Business Rules

1. Tags are **scoped per user** — a user can only see and assign their own tags.
2. Tag **names must be unique per user** — enforced via a DB unique constraint on `(user_id, name)`.
3. Tags are **permanent** — once created they remain in the database. There is no delete or edit operation on tags.
4. Tag **colour** is chosen from a predefined palette defined and validated on the frontend. The backend stores the colour as a plain string with no validation.
5. The backend must verify that a tag **belongs to the same user** as the todo before creating a `todo_tags` association (prevents cross-user tag injection via direct API calls).

---

## API

### `GET /api/tags`

Returns all tags belonging to the authenticated user.

**Response `200`**
```json
[
  { "id": "uuid", "name": "urgent", "color": "red" },
  { "id": "uuid", "name": "work",   "color": "blue" }
]
```

---

### `POST /api/tags`

Creates a new tag for the authenticated user.

**Request body**
```json
{ "name": "urgent", "color": "red" }
```

- `name`: required, non-empty string.
- `color`: required, non-empty string.

**Response `201`**
```json
{ "id": "uuid", "name": "urgent", "color": "red" }
```

**Errors**
- `409 Conflict` — a tag with the same name already exists for this user.

---

### `GET /api/todos` — updated response

Each todo now embeds its associated tags.

```json
[
  {
    "id": "uuid",
    "title": "Buy groceries",
    "description": "",
    "dueDate": null,
    "status": "todo",
    "tags": [
      { "id": "uuid", "name": "urgent", "color": "red" }
    ]
  }
]
```

---

### `POST /api/todos` — updated request

Accepts an optional `tagIds` field.

```json
{
  "title": "Buy groceries",
  "description": "",
  "dueDate": null,
  "status": "todo",
  "tagIds": ["uuid", "uuid"]
}
```

- `tagIds`: optional array of tag UUIDs. All IDs must belong to the authenticated user; any that do not are silently ignored (or rejected — see implementation note below).

---

### `PATCH /api/todos/:id` — updated request

Accepts an optional `tagIds` field. When present, the backend **replaces** the full set of tag associations for that todo (not a merge — a full sync).

```json
{
  "tagIds": ["uuid"]
}
```

---

## Frontend

### Colour Palette

A fixed set of named colours defined as a constant in the frontend codebase. Each entry has:
- a `key` (stored in the DB, e.g. `"red"`)
- a display label (e.g. `"Red"`)
- Tailwind classes for background and text (used to render badges and swatches)

Example palette (exact colours to be finalised during implementation):

| Key      | Label    |
|----------|----------|
| `red`    | Red      |
| `orange` | Orange   |
| `yellow` | Yellow   |
| `green`  | Green    |
| `teal`   | Teal     |
| `blue`   | Blue     |
| `violet` | Violet   |
| `pink`   | Pink     |
| `gray`   | Gray     |

---

### TodoModal — Tag Picker

- A combobox/autocomplete field is added to the todo create/edit modal.
- Typing filters the user's existing tags by name.
- Selecting an existing tag adds it to the task's tag list.
- If the typed name does not match any existing tag, a **"Create tag"** option appears. Selecting it shows a colour swatch picker (palette tiles); confirming immediately calls `POST /api/tags` (eager creation) and adds the new tag to the task.
- Tags already applied to the task appear as removable pills inside the combobox field.
- Tags can be removed from the task by clicking the `×` on the pill.

---

### TodoCard — Tag Display

- Tags are rendered as coloured `<Badge>` pills below the task title, using the tag's palette colour as the badge background.
- If a task has no tags, the tag area is not rendered (no empty space).

---

## Frontend Data Flow

1. On app load (after authentication), fetch `GET /api/tags` and `GET /api/todos` in parallel.
2. Store the tag list in application state (available for the combobox across all modals).
3. When a user creates a new tag inline (`POST /api/tags`), append the result to the tag list in state immediately.
4. When creating or updating a todo, include `tagIds` (the IDs of the currently selected tags) in the request body.
5. Todo objects returned from the API already embed their tags — no client-side join required.

---

## Open Questions / Future Work

- **Tag filtering**: clicking a tag badge on a `TodoCard` will eventually filter the list to show only todos with that tag. Not implemented in this version.
- **Tag editing/deletion**: renaming or recolouring a tag, or removing a tag from the library entirely, is deferred to a future version.
- **Tag ordering**: tags are currently unordered; a future version may allow drag-to-reorder.
