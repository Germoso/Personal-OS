# Feature: M2 — Internal Calendar

Personal OS, milestone 2: a first-class calendar inside the app. Events live in
SQLite next to tasks, and tasks with a due date show up on the day they are due.

Branch: `feat/m2-calendar` (stacked on `feat/m1-tasks-projects`, M1 is not merged yet).

## Specs

S6 — Scope (approved roadmap item, verbatim): "M2 | Calendario interno (eventos + vista semanal; las tareas con fecha aparecen ahí)". User confirmation (verbatim): "ARRANCA M2".

S7 — Event entity (derived from S6): title (required), notes (optional), date (required, `YYYY-MM-DD`), and optional times: when both `startTime` and `endTime` are absent the event is all-day. Times use `HH:MM` 24h. Validation: an end time without a start time is rejected; when both exist, `endTime` must be later than `startTime`.

S8 — Weekly view (from S6): route `/calendar` renders Monday-to-Sunday of the anchor week, one column per day. Each column lists that day's events (all-day first, then by start time) and the unsolved tasks whose due date falls on that day. Previous/next week navigation via a `?week=YYYY-MM-DD` anchor.

S9 — Verification: tests for the event schema, the event repository (validation, CRUD, range queries), the week-range date helper, the FormData server actions, and an HTTP smoke test of `/calendar` against a seeded database.

Non-goals (not requested): external calendar sync (Google/CalDAV), recurring events, reminders or notifications, drag-and-drop editing, monthly/yearly views, time zones beyond the machine's local day.

## Tasks

- C1 (S6, S9) — Feature document, branch and tracking. Route: inline. Commit: (this document)
- C2 (S7) — Events schema + migration + model tests. Route: inline. Commit: b146bf9
- C3 (S8) — Week range date helpers + tests. Route: inline. Commit: 990e201
- C4 (S7) — Event repository (validation, CRUD, range listing) + tests. Route: inline. Commit: 4e3ac7a
- C5 (S8) — Tasks-by-due-range query + tests. Route: inline. Commit: a49450f
- C6 (S7, S9) — Event server actions + FormData form actions + tests. Route: inline. Commit: ee16ac0
- C7 (S8) — `/calendar` weekly view with navigation and event form. Route: inline. Commit: 8ce8e64
- C8 (S9) — README update + final verification. Route: inline. Commit: 8ce8e64

## Log

L11 — User request (verbatim): "ARRANCA ME" / "ARRANCA M2".
L12 — Plan decision: M2 is a new domain module (`src/modules/calendar`) with its own Drizzle schema file, while reusing the shared SQLite client, the validation/error-mapping conventions and the `instant = false` rendering strategy from M1.
L13 — Entity decision (architect, from S6): events carry an optional time window so both all-day and timed events are supported without a second entity; rejected adding recurrence or time zones because they were not requested.
