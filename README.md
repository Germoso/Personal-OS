# Personal OS

A local-first web app to run your personal life: projects, tasks and — in later
milestones — a calendar and finances. All data lives in a single SQLite file on
your machine. No accounts, no cloud.

**Status:** milestone 2 (M2) — internal calendar (events + weekly view) on top of M1.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, server components, server actions)
- TypeScript, Tailwind CSS 4
- [Drizzle ORM](https://orm.drizzle.team) over SQLite (`better-sqlite3`)

## Requirements

- Node.js 24+ and npm
- No database server: SQLite is embedded

## Getting started

```bash
npm install
npm run db:migrate   # creates data/personal-os.db and applies migrations
npm run dev          # http://localhost:3000
```

`DATABASE_PATH` overrides the database location (default
`data/personal-os.db`, git-ignored).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after editing a schema |
| `npm run db:migrate` | Apply pending migrations |

## Views

- **/inbox** — tasks without a project
- **/hoy** — overdue tasks plus tasks due today (open tasks only)
- **/calendar** — weekly view (Mon–Sun): events plus dated, open tasks
- **/projects** — active and archived projects
- **/projects/[id]** — one project with its tasks

## Structure

```
src/
  app/                    routes (inbox, hoy, calendar, projects, projects/[id])
  db/                     sqlite client factory + app singleton
  lib/date.ts             local-day helpers
  modules/tasks/
    db/schema.ts          projects & tasks tables
    db/repository.ts      validated reads/writes (pure, db-injected)
    actions.ts            server actions (typed input)
    form-actions.ts       server actions bound to <form> submissions
    components/           task form/list, project form/list
  modules/calendar/
    db/schema.ts          events table
    db/repository.ts      validated reads/writes (pure, db-injected)
    form-actions.ts       server actions bound to <form> submissions
    components/           event form
drizzle/                  generated migrations
odd/tasks/                feature specs and task log
```

The repository is the only place that talks to SQLite. It receives the
connection as an argument, so tests run against an in-memory database with the
real migrations applied. Server actions are thin: they validate through the
repository and map domain errors to a serializable `ActionResult`.

## Testing

```bash
npm test
```

- `db/*.test.ts` — schema defaults, constraints and every repository operation,
  against `:memory:` SQLite with migrations applied.
- `action-result.test.ts` and `form-actions.test.ts` — server-action error
  mapping and `FormData` parsing, with `next/cache` mocked.

## Roadmap

| Milestone | Scope |
| --- | --- |
| **M1** (done) | Projects and tasks |
| **M2** (done) | Internal calendar: events and a weekly view; dated tasks show up there |
| **M3** | Finances: accounts, transactions, categories, balance |

Deliberate non-goals for M1: external calendar sync, authentication, cloud
sync, multi-user access.
