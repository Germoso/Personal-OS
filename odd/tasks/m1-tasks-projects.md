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

- T1 (S1) — Scaffold Next.js app + tooling (TS, Tailwind, ESLint, Drizzle, vitest). Route: inline. Commit: 9b7ee8f
- T2 (S2, S3) — Drizzle schema + migration: projects & tasks tables, with model tests. Route: inline. Commit: cb42ded
- T3 (S3) — Task repository: CRUD, status/project moves, queries, with tests. Route: inline. Commit: cb42ded
- T4 (S2) — Project repository: CRUD, archive, queries, with tests. Route: inline. Commit: cb42ded
- T5 (S2, S3) — Server actions glue ('use server' + revalidatePath), with error-mapping test. Route: inline. Commit: bcb9b58, 5be0ae1
- T6 (S4) — Views: Inbox, projects list, project detail. Route: inline. Commit: 31c8b22
- T7 (S4) — View "Hoy" (overdue + due today). Route: inline. Commit: 073b103
- T8 (S1) — README + final full verification. Route: inline. Commit:

## Log

L1 — Original request (verbatim): "necesito hacer un personal os, que sea una web donde gestiono mi calendario, mi lista de proyectos y tareas, mis finanzas, etc etc"

L2 — Product decisions (verbatim): "MVP: solo tareas y proyectos"; "Next.js + TypeScript"; "Local-first (SQLite)"; "Calendario interno propio".

L3 — Scope approval (verbatim): "Sí, arrancar M1" — approved the proposed architecture, the M1 spec, and the project location `/home/germoso/personal-os`.

L4 — Slice boundary record: commits 9b7ee8f (tooling) and cb42ded (data layer) total 1125 authored lines on `feat/m1-tasks-projects`, past the ~400-line guidance. They were delivered as one cohesive unit because the schema, generated migration, repository and their 32 tests are not independently reviewable; 189 of those lines are the machine-generated Drizzle snapshot. Later units (actions glue, each view, docs) are committed separately to stay under the limit.

L5 — Verification so far: `npx vitest run` 32/32 passed, `npx tsc --noEmit` clean, `npx eslint .` clean.

L6 — Defect caught by test-first (T5): `form-actions.ts` initially performed the write without revalidating, so the UI would keep serving stale data after a form submit. Three failing tests (`expected revalidatePath to be called with ['/', 'layout']`) exposed it; the fix invalidates the route tree on every successful write. Tests: 49/49 passing after the fix.

L7 — Rendering strategy decision: with Next 16 `cacheComponents: true`, database reads outside `<Suspense>` are flagged as blocking prerender. Chosen fix: `export const instant = false` on the four data routes, because a local SQLite read is sub-millisecond and streaming placeholders would add a visible flash without benefit. Routes therefore render on demand and never serve prerendered stale data.

L8 — Functional verification (M1 views): dev server smoke test against a migrated, seeded database. `GET /` → 307 to `/inbox`; `/inbox` shows only project-less tasks; `/hoy` shows overdue plus due-today and excludes undated and done tasks; `/projects` shows active project with its task count; `/projects/1` shows only that project's tasks; rendered HTML contains 8 server-action-bound forms.

L9 — Final verification (T8): `npx vitest run` 6 files / 49 tests passed; `npx tsc --noEmit` clean; `npx eslint .` clean; `npm run build` exit 0 with `/inbox`, `/hoy`, `/projects`, `/projects/[id]` rendered dynamically (ƒ) and zero prerender warnings in the dev log. `npm audit --omit=dev` reports 0 vulnerabilities; the 9 dev-only advisories are transitive through `eslint-config-next` (`braces`, stack-exhaustion DoS) and their only fix requires downgrading to `eslint-config-next@14`, which is not worth taking for a lint-time tool.

L10 — Scope note: M1 delivered exactly S1-S5. Not built (deferred by user decision): calendar module (M2), finances module (M3), external calendar sync, auth, cloud sync.
