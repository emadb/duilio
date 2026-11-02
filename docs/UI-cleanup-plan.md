# UI cleanup — Plan

Source: `docs/UI-review.md` and the direction chosen on 2026-11-02: **A, Streamline** (soft grey ground, white cards with a thin black outline and a flat shadow under the edge, Poppins, coral accent, a light column title with a colored dot, dashed ghost card).

Front-end only. No backend change, no migration.

## Working mode

- One branch: `ui-cleanup`, from `main`.
- One commit per item. No PR (you create it).
- Gate before each commit: `npx tsc --noEmit` in `front-end/`, `npm run build`. Rust is untouched.
- Browser check for each item with headless Chrome (screenshot, console).
- Statuses: `todo` / `doing` / `done` / `blocked`.

## Design tokens (Streamline)

| Token | Value |
| --- | --- |
| Page background | `#F4F4F2` |
| Ink (text, outlines) | `#111111` |
| Muted text | `#6B6B68` |
| Accent (primary buttons) | `#F4705A`, text on it `#111` |
| Column dots | This week `#5B8DEF`, Doing `#FFC93C`, Waiting on `#4FC1BE`, Paused `#F4705A`, Ideas `#B9B9FF`, Done `#8FD694` |
| Card | white, `1.5px` ink outline, radius 12, shadow `0 4px 0 ink` |
| Badge | `#ECECE8`, radius 8; stale badge `#FFE3DD` |
| Font | Poppins 400/500/600/700 |

Existing `--eui-*` variables stay. Their values change in `front-end/src/main.tsx`, so every screen follows without edits. Components get edits only where the shape changes.

## Items

### 1. Remove the summary bar — status: done
- Goal: delete the panel under the header. The header chips already show the counts.
- Files: `App.tsx`, delete `components/SummaryBar/SummaryBar.tsx`.
- Acceptance: no panel on the board; build passes.

### 2. Theme tokens and font — status: done
- Goal: new colors, radius and shadow tokens in `main.tsx`. Poppins loaded from Google Fonts with a system fallback stack. Primary button becomes coral with ink text and the outline plus flat shadow.
- Files: `front-end/src/main.tsx`, `front-end/index.html`.
- Acceptance: login, modal, review and log screens pick up the new colors and font with no layout break. Screenshots of all five.

### 3. Cards: outline, flat shadow, smaller title — status: todo
- Goal: Streamline card. Title 15px, weight 600, line height 1.35. Badges per the table. Drop the hover shadow change.
- Files: `components/TaskCard/TaskCard.tsx`, `components/common/Badge.tsx`, `TagPill.tsx`, `DueBadge.tsx`.
- Acceptance: screenshot; a long title wraps without crowding the flag and pencil icons.

### 4. Columns: no panel, light title — status: todo
- Goal: the grey column panel goes away. The title is a small colored dot, the name in ink (14px, weight 600, no uppercase) and the count in muted grey. No border and no background on the title. The dot color comes from `STATUSES`. The "Add task" button leaves the header.
- Files: `components/StatusSection/StatusSection.tsx`, `constants/index.ts` (dot colors, already present), `types/task.ts` (`StatusMeta`).
- Acceptance: header has the toggle, dot, name and count. Drop target still highlights during a drag.

### 5. Swap Paused and Done — status: todo
- Goal: Paused becomes a board column (after Waiting on). Done becomes the collapsed drawer.
- Files: `constants/index.ts` (move the `drawer: true` flag). `App.tsx` already reads the flag.
- Acceptance: five columns Ideas, This week, Doing, Waiting on, Paused. The Done drawer is collapsed and shows its count. Dropping a card on the Done drawer still works.
- Note: this week's done cards stay hidden until the drawer opens. The header chip keeps the count.

### 6. Ghost "Add task" card — status: todo
- Goal: a dashed card with a black "+" circle at the end of every column and in the Done drawer. Click opens the task modal with that status (D1 = A). It replaces the "No tasks — add one" box.
- Files: `StatusSection.tsx`, new `components/TaskCard/GhostCard.tsx`.
- Acceptance: ghost card in every column; click opens the modal with the right status; keyboard focus works.

### 7. Less noise — status: todo
- Goal (D2 = a, b, c): flag and pencil show only on hover, and the flag stays visible on an important card. Description clamps to 2 lines. The flatter look (D2 d) is already part of items 3 and 4.
- Files: `TaskCard.tsx`.
- Acceptance: before and after screenshots. Touch screens: icons stay visible when there is no hover (`@media (hover: none)`).

### 8. Other screens — status: todo
- Goal: modal, status prompt, review, log, import and login use the same outline, radius and button style.
- Files: `TaskModal.tsx`, `StatusPrompt.tsx`, `WeeklyReview.tsx`, `WeeklyLog.tsx`, `TrelloImport.tsx`, `AuthModal.tsx`, `AppHeader.tsx`.
- Acceptance: one screenshot per screen; no clipped text.

## Decisions

- **Direction:** A, Streamline (chosen 2026-11-02).
- **Column title:** dot + name + count, no pill (chosen 2026-11-02). The pills in the mockup were too heavy.
- **D1 = A:** the ghost card opens the existing modal. A Trello-style inline composer is possible later.
- **D2 = a, b, c.** Option d is covered by the Streamline theme.
- **Font host:** Poppins from Google Fonts, as a link in `index.html`. No new npm package. The app then needs internet for the font and falls back to the system font offline. Self-hosting through `@fontsource/poppins` is the alternative; it adds an npm dependency, so it needs your approval.
- **Dark mode:** out of scope. The app has none today.

## Decision log

(empty)
