# Duilio — Weekly Workflow Spec

Nov 1, 2026 · @emanuele

## Goal and principles

Duilio becomes a weekly planner: the board looks like today's Trello flow, and every Monday it makes you review everything you didn't finish.

- **Keep the habits that work.** The columns mirror the current Trello board (Maybe, To-do, In progress, Waiting, Done), so moving over costs nothing.
- **Bring back the paper-book review.** Rewriting yesterday's tasks forced a decision on each one. Duilio does the same once a week: nothing unfinished moves on silently.
- **Unfinished work may simply not be needed anymore.** Delete is a first-class choice in the review, not a failure.
- **No limits in v1.** No caps on This week or Doing. Use it for 3–4 weeks first, then decide on constraints from real data.

## The lists

Six lists: five columns on the board, plus Paused in a drawer because it shouldn't take space all week.

| List | What it holds | Replaces in Trello | Where it shows |
| --- | --- | --- | --- |
| **Ideas** | Anything without a date: vague ideas to investigate, projects to start one day, defined tasks that aren't for now | Maybe | Column |
| **This week** | What you plan to work on in the next few days. Cards can be added any time during the week | To-do | Column |
| **Doing** | Started work. A card can stay here for days | In progress | Column |
| **Waiting on** | Blocked by someone else: a colleague's reply, a customer's email. Records *who* and *since when* | Waiting (blocked part) | Column |
| **Paused** | Work you chose to stop until a given week ("back in week 48") | Waiting (paused part) | Drawer |
| **Done** | Completed cards, grouped by the week they were completed in | Done | Column (this week only) |

&#91;embedded content: card flow · 6 lists, 1 weekly review\]

Cards in the dashed area are reviewed every Monday: each one is kept, sent back to Ideas, paused or deleted.

Rules:

- A new card lands in **Ideas** unless you create it directly in another column.
- Moving a card to **Waiting on** asks who you're waiting for; the date is set automatically.
- Moving a card to **Paused** asks for the week it should return.
- The Done column shows only this week's cards; older ones live in the weekly log.

## The week

A week runs Monday 00:00 to Sunday 23:59 in the user's time zone (Europe/Rome), and it is the only planning unit.

- **No day planning.** Cards are not assigned to days; a due date stays optional, as today.
- **Identified by its Monday.** A week is stored as the date of its Monday (`week_start`), shown as "Week 45 · 3–9 Nov".
- **Time zone per user.** The week boundary is computed in the user's time zone, not the server's UTC, so a card finished at 00:30 on Monday in Rome counts for the new week.
- **Open all week.** This week accepts new cards at any time; there is no lock after Monday.

## Monday review

The first time you open Duilio in a new week, a review screen appears before the board; every unfinished card needs a decision.

**When it appears**

- On the first visit on or after Monday, if the current week has no `reviewed_at`.
- If you skip a week entirely, one review covers everything still open; it is not repeated per missed week.
- The board stays reachable ("Review later"), but a banner remains until the review is completed.

**What gets reviewed**

1. Cards in **This week** not completed.
2. Cards in **Doing**, with the badge "in Doing for N days".
3. Cards in **Waiting on**, showing who and since when.
4. Cards in **Paused** whose return week has arrived.

**Actions per card**

| Action | Result |
| --- | --- |
| Keep in This week | Stays or moves to This week; rollover counter +1 |
| Keep in Doing | Stays in Doing; rollover counter +1 |
| Still waiting | Waiting on cards only: stays, who and since are kept |
| Back to Ideas | Moves to Ideas; rollover counter reset |
| Pause until week N | Moves to Paused with a return week |
| Delete | Card removed |

**Bulk actions:** "Keep all as they are" and "Move all remaining to Ideas", for busy Mondays.

**Completing the review**

- Sets `reviewed_at` on the week, so the screen won't appear again.
- Last week's Done cards leave the Done column and appear in the weekly log.
- An optional free-text note about last week can be saved with it.

## Card details and badges

Cards keep everything they have today (title, markdown description, tags, due date, important flag) and gain small badges that make stale work visible.

| Badge | Shown on | Example |
| --- | --- | --- |
| Days in column | Doing | "12d" |
| Waiting on | Waiting on | "Marco · 5d" |
| Return week | Paused | "Back wk 48" |
| Rollover count | Any card carried over at least once | "↻3" |
| Completed on | Done | "Thu" |

The important flag stays as it is; it is not renamed or given new rules in v1.

## Data model changes

One migration extends the existing `todos` table and adds a `weeks` table; existing cards keep their current status.

**Status enum `todo_status`**

| Value | List | Change |
| --- | --- | --- |
| `idea` | Ideas | New |
| `todo` | This week | Existing, meaning narrowed |
| `in-progress` | Doing | Existing |
| `blocked` | Waiting on | Existing |
| `paused` | Paused | New |
| `done` | Done | Existing |

**New columns on `todos`**

| Column | Type | Purpose |
| --- | --- | --- |
| `status_changed_at` | timestamptz, not null | Days-in-column badge |
| `waiting_on` | text, null | Who you're waiting for |
| `waiting_since` | timestamptz, null | Since when |
| `paused_until` | date, null | Monday of the return week |
| `completed_at` | timestamptz, null | Done log and weekly grouping |
| `rollover_count` | int, default 0 | Times carried over in a review |

**New table `weeks`**

| Column | Type | Purpose |
| --- | --- | --- |
| `user_id` | uuid | Owner |
| `week_start` | date | Monday of the week; unique with `user_id` |
| `reviewed_at` | timestamptz, null | Review completed |
| `note` | text | Optional note written during the review |

**User setting:** a `timezone` column on `users`, default `Europe/Rome`.

Backfill: `status_changed_at = updated_at`, and `completed_at = updated_at` for cards already done.

## Trello import and weekly Done log

**Trello import:** upload the board's JSON export once, so the trial starts from real cards.

| Trello column | Duilio list |
| --- | --- |
| Maybe | Ideas |
| To-do | This week |
| In progress | Doing |
| Waiting | Waiting on (who left empty; sort into Paused during the first review) |
| Done | Done (archived cards skipped) |

Card title, description and labels (as tags) are imported; checklists are appended to the description as markdown tasks.

**Weekly Done log:** a page listing completed cards grouped by week, newest first, with a count per week. Each week can be copied as markdown for status updates or timesheets, together with its review note.

## Out of scope for v1, decide after the trial

These ideas came up while designing and are deliberately left out until 3–4 weeks of real use show whether they're needed.

| Idea | Trigger to reconsider |
| --- | --- |
| 1–3 weekly objectives linked to cards | The review feels like card-shuffling with no sense of what the week was for |
| "Ready" tag to split Ideas | Vague ideas and defined-but-later tasks get mixed up |
| Daily star for today's 1–3 cards | The weekly review alone feels too coarse |
| Limits on This week or Doing | Many cards roll over week after week |
| History view (completion and rollover trends) | Enough weeks of data to read a trend |
| Ideas ageing (cards untouched for 90 days surfaced in the review) | Ideas grows faster than it is pruned |

## Build order

Steps 1–3 are the minimum to start the trial; step 4 makes it start from real cards.

- [ ] 1\. Migration: new statuses, card columns, `weeks` table, user time zone, backfill
- [ ] 2\. Board: Ideas, This week, Doing, Waiting on, Done columns; Paused drawer; badges; who/return-week prompts
- [ ] 3\. Monday review: API that detects an unreviewed week and returns the cards; review screen with per-card and bulk actions
- [ ] 4\. Trello JSON import
- [ ] 5\. Weekly Done log with markdown copy
- [ ] 6\. Use it for 3–4 weeks, then revisit the out-of-scope list
