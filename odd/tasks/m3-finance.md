# Feature: M3 — Finances

Personal OS, milestone 3: a finances module. Accounts, categories and
transactions live in SQLite next to tasks and events. Balances are derived
from an opening balance plus cleared transactions.

Branch: `feat/m3-finance` (stacked on `feat/m2-calendar`, M2 is not merged yet).

## Specs

S10 — Scope (approved roadmap item): "M3 | Finanzas: accounts, transactions, categories, balance". User confirmation (verbatim): "SI, BIEN AHI".

S11 — Account entity (derived from S10): name (required), type (one of checking, savings, cash, credit), currency (default "ARS"), openingBalance (integer cents, default 0). Archived accounts stay in the database but are hidden from active views.

S12 — Category entity (derived from S10): name (required), kind (income or expense), color (hex, default #6366f1). Categories are reusable across accounts.

S13 — Transaction entity (derived from S10): account (required, FK), amount (integer cents, signed: positive = income, negative = expense), date (YYYY-MM-DD, required), description (optional, default ""), category (optional FK), status (cleared or pending, default cleared). A transaction's amount sign must be consistent with its category kind when a category is set: an income category requires a positive amount, an expense category requires a negative amount. Transactions are immutable-ish: updating re-validates.

S14 — Balance (derived from S10): account balance = openingBalance + sum of cleared transaction amounts for that account. Total balance = sum of all active account balances. Pending transactions do not affect balances.

S15 — Views (derived from S10): `/finance` shows total balance, per-account balances, and the latest transactions. `/finance/accounts` CRUD for accounts. `/finance/categories` CRUD for categories. `/finance/transactions` lists transactions with filters (account, category, date range) and a form to create new ones.

S16 — Verification: tests for account/category/transaction schemas, repositories (validation, CRUD, queries, balance), server actions, FormData form actions, and an HTTP smoke test of `/finance`.

Non-goals (not requested): budgets, advanced reports/charts, multi-currency conversion, recurring transactions, bank import, transaction splitting, tags.

## Tasks

- F1 (S10, S16) — Feature document, branch and tracking. Route: inline. Commit: (this document)
- F2 (S11) — Accounts schema + migration + model tests. Route: inline. Commit: 9f531a7
- F3 (S12) — Categories schema + migration + model tests. Route: inline. Commit: 9f531a7
- F4 (S13) — Transactions schema + migration + model tests. Route: inline. Commit: 9f531a7
- F5 (S11) — Account repository (validation, CRUD, balance) + tests. Route: inline. Commit: b20436f
- F6 (S12) — Category repository (validation, CRUD) + tests. Route: inline. Commit: b20436f
- F7 (S13, S14) — Transaction repository (validation, CRUD, queries, balance impact) + tests. Route: inline. Commit: b20436f
- F8 (S15) — Server actions + FormData form actions + tests. Route: inline. Commit: 3d2f59b
- F9 (S15) — Finance views (summary, accounts, categories, transactions) + navigation. Route: inline. Commit: b566284
- F10 (S16) — README update + final verification. Route: inline. Commit: 32efba4

## Log

L20 — User request (verbatim): "DALE M3".
L21 — Plan decision: M3 is a new domain module (`src/modules/finance`) with its own Drizzle schema file, reusing shared SQLite client, validation/error-mapping conventions, `instant = false` rendering strategy, and the timestamps column helper from M1/M2.
L22 — Entity decision (architect, from S10): three entities (accounts, categories, transactions). Amounts stored as integer cents to avoid float rounding. Balance is derived, never stored. Categories are optional on transactions but when present must match the amount sign.
