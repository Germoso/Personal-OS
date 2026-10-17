# Personal OS

A local-first web app to run your personal life: projects, tasks and — in later
milestones — a calendar and finances. All data lives in a single SQLite file on
your machine. No accounts, no cloud.

**Status:** milestone 5 (M5) — AI assistant: a floating chat panel that runs your personal OS by natural language (tasks, calendar, finance, kitchen) via a local LLM, with configurable autonomy and a persistent local conversation history.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, server components, server actions)
- TypeScript, Tailwind CSS 4
- [Drizzle ORM](https://orm.drizzle.team) over SQLite (`better-sqlite3`)

## Requirements

- Node.js 24+ and npm
- No database server: SQLite is embedded
- A Runware API key for the AI assistant (see below). The rest of the app works without it; the chat panel shows an error until the key is set.

## Getting started

```bash
npm install
npm run db:migrate   # creates data/personal-os.db and applies migrations
npm run dev          # http://localhost:3000
```

`DATABASE_PATH` overrides the database location (default
`data/personal-os.db`, git-ignored).

## AI assistant (M5)

A floating chat panel (bottom-right, every page) lets you ask for things in
natural Spanish and the assistant performs real operations through the LLM
tools. **`RUNWARE_API_KEY`** (plus optional `RUNWARE_BASE_URL`, `AI_MODEL`,
`AI_MAX_TOKENS`) go in a local, git-ignored `.env.local` — create it with your
own Runware key before using the assistant:

A committed template lives at `.env.example` (no secrets inside). Copy it and
fill in your own key:

```bash
cp .env.example .env.local   # then edit .env.local with your own Runware key
```

The assistant only operates on your own personal OS data (tasks, events,
accounts, transactions, ingredients, recipes) — it has no access to anything
else outside the app. Answers render readable Markdown in the panel (tables,
lists, code blocks, links). Autonomy is configurable from the panel:

- **Confirmar borrados** (default) — destructive actions (deletes, archives, account deletions) ask for confirmation.
- **Confirmar cambios** — every mutating action asks for confirmation.
- **Autónomo** — the assistant executes everything it is asked to.

Conversations and an audit log of executed actions are stored in SQLite
(`ai_chats`, `ai_messages`, `ai_settings`, `ai_actions`).

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
- **/finance** — financial summary: total balance, per-account balances, recent transactions
- **/finance/accounts** — CRUD for accounts
- **/finance/categories** — CRUD for categories
- **/finance/transactions** — transaction list with filters + creation form
- **/kitchen** — kitchen summary: ingredient/recipe counts, cookable recipes
- **/kitchen/ingredients** — ingredient list (also serves as shopping list: mark available/unavailable)
- **/kitchen/recipes** — recipe list + creation + cookability status
- **/kitchen/recipes/[id]** — recipe detail with ingredients (add, edit quantity, remove), instructions, cookability
- **floating AI panel** — every page: chat with the assistant, confirm/cancel proposed actions, choose autonomy level
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
  modules/finance/
    db/schema.ts          accounts, categories, transactions tables
    db/repository.ts      validated reads/writes, balance calculation
    form-actions.ts       server actions bound to <form> submissions
    components/           account, category, transaction forms/lists
  modules/kitchen/
    db/schema.ts          ingredients, recipes, recipe_ingredients, shopping_items, pantry_items
    db/repository.ts      validated reads/writes, cookability, shopping generation
    form-actions.ts       server actions bound to <form> submissions
    components/           ingredient, recipe, shopping, pantry forms/lists
  modules/ai/
    db/schema.ts          ai_chats, ai_messages, ai_settings, ai_actions (audit log)
    db/repository.ts      validated reads/writes (pure, db-injected)
    llm/client.ts         OpenAI-compatible client (Runware), injectable fetch
    tools/registry.ts     38 tools over the modules' repositories
    orchestration/loop.ts autonomy gate + confirmation flow, injectable LLM
    prompt.ts             system prompt (Spanish-first)
    form-actions.ts       server actions for the chat panel (send/confirm/settings)
  components/ai/          floating chat panel (client component)
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
- `modules/ai/*.test.ts` — schema/repository tests against `:memory:`; LLM
  client tests with a mocked HTTP layer; orchestration and server-action tests
  with a stub LLM and executor. No network or real database involved.

## Roadmap

| Milestone | Scope |
| --- | --- |
| **M1** (done) | Projects and tasks |
| **M2** (done) | Internal calendar: events and a weekly view; dated tasks show up there |
| **M3** (done) | Finances: accounts, transactions, categories, balance |
| **M4** (done) | Kitchen: ingredients, recipes, shopping list, pantry, cookability |
| **M5** (done) | AI assistant: floating chat panel, 38 LLM tools over the personal OS, configurable autonomy, persisted conversations and action audit log |

Deliberate non-goals for M1: external calendar sync, authentication, cloud
sync, multi-user access. The AI assistant is an *internal tool*: it only reads
and writes your own personal OS data, never the web or external accounts.
