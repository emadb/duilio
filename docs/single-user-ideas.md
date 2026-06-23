# Single-User Feature Ideas

Inspired by Things 3, OmniFocus, Todoist, and similar personal productivity tools.

---

## Core Task Management

### Priority Levels
Four levels (Urgent / High / Medium / Low) shown as a color indicator on the card and sortable in each column. Lets you see what matters most at a glance without relying on column position alone.

### Subtasks / Checklists
A task can contain a list of checkable steps. The card shows a progress indicator (e.g. "3/5"). Useful for breaking down larger work without creating many small tasks.

### Drag and Drop
Drag cards between columns to change status, and reorder cards within a column to set manual priority. The most natural interaction model for a kanban board — currently missing.

### Recurring Tasks
Mark a task as recurring (daily / weekly / monthly / custom). When marked done, it automatically respawns with the next due date. Great for habitual or maintenance work.

### Start Date
Separate from due date. A task is invisible or greyed-out until its start date, so future work doesn't clutter the board. Things 3 calls this "When" vs "Deadline."

---

## Views and Navigation

### Multiple Projects / Lists
Group tasks into named projects (like Trello boards). A sidebar or dropdown lets you switch context. The current single flat board works well early on but becomes noisy as tasks accumulate.

### Smart Views
Pre-built filtered views that aggregate tasks across all projects:
- **Today** — tasks due today or with start date = today
- **Upcoming** — tasks due in the next 7 days, grouped by day
- **Someday** — tasks with no due date and low priority (a parking lot)
- **Logbook** — completed tasks archive

### Calendar View
A monthly/weekly calendar showing tasks by due date. Good for spotting overloaded days and planning.

### Sorting Options
Per-column sort by: due date, priority, creation date, manual order. Currently tasks appear in creation order only.

### Advanced Filters
Beyond the current status toggle: filter by tag, priority, due date range, or any combination. Useful when the board grows large.

---

## Productivity Features

### Keyboard Shortcuts
Power-user feature that users love deeply once discovered. Key targets:
- `N` — new task
- `E` — edit selected
- `J/K` — navigate between cards
- `1–4` — change status
- `D` — set due date

### Quick Entry
A global keyboard shortcut (system-level or browser extension) that opens a minimal input field to capture a task without navigating to the board. Things' Quick Entry is one of its most praised features.

### Natural Language Date Parsing
Type "next monday", "in 3 days", "end of month" in the due date field instead of picking from a calendar. Dramatically speeds up task creation.

### WIP Limits
Set a maximum number of in-progress tasks per column. The column header turns red when over the limit. A lightweight way to enforce focus.

### Time Estimates
Attach an estimated duration to a task (e.g. 30 min, 2 h). Show total estimated time per column. Helps with daily planning.

### Focus / Pomodoro Timer
Start a timer directly from a task card. When the session ends, prompt to log what was done or move the task forward.

---

## Organization

### Sections / Headings Within a Column
Add collapsible headings inside a status column to group related tasks (e.g. "Frontend", "Backend" within In Progress). OmniFocus and Things both support this.

### Task Templates
Save a task (with subtasks, tags, due offset) as a reusable template. Good for recurring project types (e.g. "onboarding a new client").

### Archive
Auto-hide tasks in the Done column older than N days (configurable). They're not deleted — accessible via an archive view. Keeps the board clean without losing history.

---

## Insights

### Productivity Stats
A simple dashboard: tasks completed per day/week, average time from creation to done, most-used tags. Helps identify patterns and feel a sense of progress.

### Task History
A timeline on the task showing when it was created, moved between statuses, and completed. Useful for reviewing how long things actually took.

---

## Data

### Export
Download all tasks as CSV, JSON, or Markdown. Essential for users who want their data portable or want to do analysis outside the app.

### Notifications / Reminders
Browser notifications (or email) when a task's due date is approaching. Requires a notification permission flow.
