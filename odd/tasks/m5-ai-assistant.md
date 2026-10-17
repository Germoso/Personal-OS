# Feature: M5 — AI Assistant (chatbot con acciones)

Personal OS, milestone 5: an AI assistant embedded in the app. A floating chat
panel on every page where the user asks things in natural language, and the
assistant performs them through the existing personal OS operations
(tasks, calendar, finance, kitchen) via an LLM API. Conversations persist in
the local SQLite database.

Branch: `feat/m5-ai-assistant` (stacked on `feat/m4-kitchen`; M3/M4 unmerged).

## Specs

S30 — Scope (user, verbatim): "necesito que implementes un módulo de inteligencia artificial o sea no un módulo un chatbot realmente donde yo pueda pedirle cosas y él lo pueda hacer por mí mediante la API o sea todo lo que yo pueda hacer en la web que él lo pueda hacer con lenguaje natural un chatbot". Decided scope: internal read + write over existing personal OS operations (create/edit/delete tasks, projects, events, transactions, accounts, categories, ingredients, recipes, ingredient availability; query/resume data). No external web actions in M5.

S31 — LLM provider (user decision, custom): Runware, OpenAI-compatible API. baseUrl `https://api.runware.ai/v1` (api `openai-completions`, `authHeader: true`), model `deepseek:v4@flash` (contextWindow 200000, maxTokens 8192). The API key lives ONLY in `.env.local` (gitignored), read server-side via `process.env`; it must never reach the client bundle nor be committed, and must not appear in the feature doc or Engram.

S32 — Floating UI (user decision): "Panel flotante en toda la app". A chat panel available on every page; conversations persist in local SQLite (user rejected stateless).

S33 — Autonomy (user decision, verbatim): "que se pueda configurar". A configurable autonomy setting with levels: `ask-on-delete` (default: creates/edits run directly, deletes require confirmation), `ask-on-mutation` (any mutation requires confirmation), `autonomous` (no confirmation). Setting persists in the AI settings store and is changeable from the panel.

S34 — Storage: `ai_chats` (conversations), `ai_messages` (role user/assistant, content, optional tool/confirmation metadata), `ai_settings` (key/value, e.g. autonomy level), `ai_actions` (audit log of executed tool calls: tool, args, result status, chat id, timestamps). Follows existing conventions (shared timestamps helper from src/db/columns.ts).

S35 — Tool surface: a tool registry in the AI module mapping natural-language intents to the existing module server actions (annex A, from exploration). Each tool: name, description, JSON-schema arguments, and a `destructive` flag. Only operations that already exist as server actions are exposed; the registry must be kept in sync (test pins each tool against its real action by name).

S36 — Orchestration loop: user message → LLM call with tools → if tool_call(s): validate + run through the autonomy gate → feed results back → repeat (bounded iterations, e.g. 4) → final assistant answer. Validation errors from the modules are returned to the LLM for correction. The loop is deterministic-testable with a stubbed LLM client; the real network call is never exercised by tests.

S37 — UI: floating panel component mounted in the root layout: toggle button, conversation list, message history, input, confirmation prompt UI for pending destructive/mutation actions, and a settings popover for the autonomy level. Follows the app's existing tailwind conventions.

S38 — Verification: unit/integration tests for schema+model, repositories, settings, provider client (HTTP mocked), tool registry, orchestration loop (stub LLM), server action, form action; `tsc`, `eslint`, `next build`; smoke that no page regresses (all existing routes 200). The API key presence is verified locally only (`.env.local` never committed; `.gitignore` covers it).

## Tasks

- A1 (S30, S35) — Feature doc, branch, tracking; exploration of tool surface (annex A). Route: inline + explore subagent. Commit: (this document)
- A2 (S34) — AI schema (chats, messages, settings, actions) + migration + model tests. Route: inline. Commit: 8671f84
- A3 (S34) — AI repositories (chats/messages CRUD, settings get/set, action log) + tests. Route: inline. Commit: 44b3cee
- A4 (S31) — Provider client (OpenAI-compatible chat completions, auth header, error mapping) + tests with mocked HTTP. Route: inline. Commit: c028685
- A5 (S35) — Tool registry mapping to existing server actions + registry tests (each tool resolves to a real server action). Route: inline. Commit: b91a3f5
- A6 (S33, S36) — Orchestration loop with autonomy gate + confirmation flow + tests with stub LLM. Route: inline. Commit: a2e4df9
- A7 (S37, S38) — Server action (send message, confirm/reject, settings) + form action + tests. Route: inline. Commit: d375297
- A8 (S37) — Floating chat panel (client component) mounted in the root layout + autonomy UI + confirm/cancel bar. Route: inline (gentle-ai-worker delegation failed twice this session without writing files). Commit: 6efec90
- A9 (S30-S38) — README (M5 section, env vars, autonomy levels, structure, roadmap) + .env.local left to the user (harness blocks writes to .env.local) + final verification: 204 tests, tsc, eslint, next build + smoke. Route: inline. Commit: (pending)
- Note: drizzle-meta files for migration 0004 and the feature doc were committed out-of-band. Commit: 5b56fa0
e2e graphql is (graphql)
- A8 (S37) — Floating chat panel UI + layout integration + confirmation/settings UI. Route: inline. Commit: (ui commit)
- A9 (S38) — README update + final verification (tests, build, smoke). Route: inline. Commit: (docs commit)

## Log

L36 — User request (verbatim): "necesito que implementes un módulo de inteligencia artificial o sea no un módulo un chatbot realmente donde yo pueda pedirle cosas y él lo pueda hacer por mí mediante la API o sea todo lo que yo pueda hacer en la web que él lo pueda hacer con lenguaje natural un chatbot".
L37 — Scope decision (user): "Interno: leer y escribir" (over existing personal OS operations).
L38 — Provider decision (user, custom): Runware OpenAI-compatible endpoint, model `deepseek:v4@flash`, apiKey provided by user — stored ONLY in `.env.local`, excluded from this doc, repo history and Engram. (User pasted the raw key in chat; flagged to the user that the key should be rotated if they want.)
L39 — Autonomy decision (user, verbatim): "que se pueda configurar" → configurable levels (S33).
L40 — UI decision (user): "Panel flotante en toda la app" → floating panel on every page, conversations persisted (stateless explicitly rejected).

## Annex A — Tool surface

Tools bind to the REAL repository operations the module form actions call
(same validation, same errors), not to the FormData wrappers: the assistant
passes JSON arguments and reads structured failures. 38 tools across the four
modules: tasks (11), calendar (4), finance (12), kitchen (11). Each tool has a
JSON Schema, a `destructive` flag (delete/archive/remove) and a `mutates` flag
(read-only = list/get/balance). Mounted in `src/modules/ai/tools/registry.ts`,
pinned by tests that resolve every `operation` to an exported repo function.