# Feature: M1 — Tasks & Projects MVP

Personal OS, milestone 1: local-first web app with a tasks and projects module.
Approved stack: Next.js + TypeScript, local-first SQLite via Drizzle ORM, Tailwind CSS, modular domain structure.

## Specs

S1 — Stack (user decisions, verbatim):
- "Next.js + TypeScript"
- "Local-first (SQLite)"
Approved architecture (approved via "Sí, arrancar M1"): Next.js App Router, Drizzle ORM over SQLite (single file `data/personal-os.db`), Tailwind CSS, modular domain structure (`src/modules/tasks`, future `modules/calendar`, `modules/finance`).

S2 — Project entity (approved spec): name, description, color, status (active / archived).

S3 — Task entity (approved spec): title, notes, optional project (no project → Inbox), status (pending / in progress / done), priority (high / medium / low), optional due date.

S4 — Views (approved spec): Inbox, projects list, tasks by project, "Hoy" view (overdue + due today).

S5 — Verification (approved spec): tests for the data model and server actions from the start, test-first where applicable.

Non-goals (from user decisions): external calendar integration ("Calendario interno propio"), cloud sync and auth ("Local-first (SQLite)"), finances module (M3), calendar module (M2).

## Tasks

- T1 (S1) — Scaffold Next.js app + tooling (TS, Tailwind, ESLint, Drizzle, vitest). Route: inline. Commit:
- T2 (S2, S3) — Drizzle schema + migration: projects & tasks tables, with model tests. Route: inline. Commit:
- T3 (S3) — Server actions: task CRUD + status transitions, with tests. Route: inline. Commit:
- T4 (S2) — Server actions: project CRUD + archive, with tests. Route: inline. Commit:
- T5 (S4) — Views: Inbox, projects list, project detail. Route: inline. Commit:
- T6 (S4) — View "Hoy" (overdue + due today). Route: inline. Commit:
- T7 (S1) — README + final full verification. Route: inline. Commit:

## Log

L1 — Original request (verbatim): "necesito hacer un personal os, que sea una web donde gestiono mi calendario, mi lista de proyectos y tareas, mis finanzas, etc etc"

L2 — Product decisions (verbatim): "MVP: solo tareas y proyectos"; "Next.js + TypeScript"; "Local-first (SQLite)"; "Calendario interno propio".

L3 — Scope approval (verbatim): "Sí, arrancar M1" — approved the proposed architecture, the M1 spec, and the project location `/home/germoso/personal-os`.
