# Product Requirements Document — "My Tasks"

**Date:** 2026-06-12
**Status:** Describes the complete, current functionality of the product

## 1. Overview

"My Tasks" is a task management application. It gives a person one
place to capture the things they need to do, track each item as it moves from
planned to in progress to done, and keep an eye on upcoming due dates.

The product is intentionally simple: one screen. The user
opens the application and immediately sees their tasks divided by status.

## 2. Goals

- Let the user capture a task in seconds, with as little required input as possible.
- Make the state of all work visible at a glance, organized by progress.
- Keep every task safely stored: anything the user creates is still there the next
  time they open the application.
- Task can be tagged so that user can add some categorization to the existing tasks.

## 3. Target user

A single individual managing their own projects and activities. There is no
collaboration, sharing, or multi-user capability: the application serves one
person and one task list.

## 4. Functional requirements

### 4.1 The task

A task consists of:

| Field | Required | Notes |
|---|---|---|
| Title | Yes | A short summary of what needs to be done. |
| Description | No | Free-form details about the task. Stored as string, formatted as Markdown |
| Status | Yes | One of **To Do**, **In Progress**, **Done**. New tasks start as "To Do" unless the user chooses otherwise. |
| Tags | No | Zero or more tags (as string) that serve as categorization method |
| Due date | No | A calendar date by which the task should be completed. |

### 4.2 Viewing tasks

- The main screen shows all tasks, grouped into three sections by status:
  **To Do**, **In Progress**, and **Done**, in that order.
- Each section header shows the section name and a count of the tasks it contains.
- Sections with no tasks are hidden entirely.
- Within the list, the most recently created tasks appear first.
- Each task is shown as a card displaying:
  - its title (truncated to one line if too long),
  - a colored status badge with a distinct icon per status (gray circle for
    To Do, blue clock for In Progress, green check for Done),
  - its due date (e.g. "Jun 12, 2026"), shown only if one was set.
  - its tags
- While the task list is being retrieved, the screen shows a "Loading tasks…" message.
- User can reorder task and order must be stored on the database

### 4.3 Filtering

- A filter control in the page header offers four options: **All**, **To Do**,
  **In Progress**, **Done**. The active option is visually highlighted.
- Selecting a status shows only the tasks in that status; "All" restores the full
  grouped view. The default is "All".
- User can filter tasks using tags: clicking on a tag shows only the tasks that have that tag.

### 4.4 Creating a task

- A prominent **"New Task"** button in the header opens a creation form in a
  dialog window.
- The form has fields for title, description, status, tags and due date. The title
  field is focused automatically so the user can start typing right away.
- The task cannot be saved while the title is empty or contains only spaces
  (the save button is disabled).
- On save, the dialog closes and the new task appears in the list immediately.
- The user can cancel at any time without creating anything.

### 4.5 Editing a task

- Clicking anywhere on a task card opens the same dialog, pre-filled with the
  task's current values.
- The user can change any field, including moving the task to a different status
  (this is how a task is marked as done).
- The same title rule applies: a task cannot be saved with an empty title.
- On save, the dialog closes and the card updates immediately.
- Cancelling discards any changes.

### 4.6 Deleting a task

- The edit dialog includes a clearly marked, red **"Delete"** button (it does not
  appear when creating a new task).
- Deleting removes the task permanently and immediately from the list.

### 4.7 Empty states

- When the user has no tasks at all, the main area shows a friendly empty state:
  "No tasks yet — Create a task to get started", with an **"Add First Task"**
  button that opens the creation dialog.
- When a filter is active and no tasks match it, the screen shows "No tasks
  found — No tasks match the selected filter."

### 4.8 Feedback and error handling

- If loading, saving, or deleting fails, the user is informed with a brief
  pop-up notification describing what went wrong (e.g. "Failed to save task").
  The application keeps working; the user can retry.
- Invalid input is rejected: a task can never be created without a title, and a
  due date that is not a real date is not accepted.

### 4.9 Data persistence

- All tasks are stored permanently. Closing and reopening the application shows
  the same task list; nothing is lost between sessions.

## 5. Look and feel

- A clean, modern, light interface centered on a single column, comfortable to
  read on both desktop and smaller screens (the header stacks vertically on
  narrow displays).
- A page header with the product identity ("My Tasks" with a checklist logo), the status filter, and the New Task button.
- Task cards subtly highlight on hover to signal that they are clickable.
- Status colors are used consistently everywhere a status appears.

## 6. Out of scope

The current product deliberately does not include:

- User accounts, login, or multi-user support.
- Task search, priorities, or categories.
- Reminders or notifications for due dates; overdue tasks are not highlighted.
- Subtasks, attachments, or comments.
- Bulk actions (e.g. delete all completed tasks).
- Undo after deletion or a confirmation step before deleting.
