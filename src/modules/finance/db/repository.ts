import { and, eq, gte, isNull, lte, ne, sql, type SQL } from "drizzle-orm";

import type { Db } from "@/db/client";

import { isValidIsoDate } from "@/lib/date";

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";

export { NotFoundError, ValidationError };
export {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  CATEGORY_KINDS,
  TRANSACTION_STATUSES,
  accounts,
  categories,
  transactions,
} from "./schema";
import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  CATEGORY_KINDS,
  TRANSACTION_STATUSES,
  accounts,
  categories,
  transactions,
} from "./schema";

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

/* --------------------------------- helpers --------------------------------- */

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`A ${field} is required.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`Invalid ${field}.`);
  }
  return value.trim();
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !isValidIsoDate(value)) {
    throw new ValidationError(
      `Invalid date: ${JSON.stringify(value)}. Expected a real calendar date as YYYY-MM-DD.`,
    );
  }
  return value;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${field}: ${JSON.stringify(value)}. Expected one of ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

const nowIso = () => new Date().toISOString();

function requireAccount(db: Db, id: number): Account {
  const found = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown account id: ${id}.`);
  return found;
}

function requireCategory(db: Db, id: number): Category {
  const found = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown category id: ${id}.`);
  return found;
}

function requireTransaction(db: Db, id: number): Transaction {
  const found = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown transaction id: ${id}.`);
  return found;
}

/* --------------------------------- accounts -------------------------------- */

export interface CreateAccountInput {
  name: string;
  type?: (typeof ACCOUNT_TYPES)[number];
  currency?: string;
  openingBalance?: number;
  status?: (typeof ACCOUNT_STATUSES)[number];
}

export function createAccount(db: Db, input: CreateAccountInput): Account {
  const currency = input.currency === undefined ? "ARS" : requiredText(input.currency, "currency");
  const openingBalance =
    input.openingBalance === undefined ? 0 : normalizeAmount(input.openingBalance, "opening balance");

  return db
    .insert(accounts)
    .values({
      name: requiredText(input.name, "name"),
      type: input.type === undefined ? undefined : oneOf(input.type, ACCOUNT_TYPES, "type"),
      currency,
      openingBalance,
      status: input.status === undefined ? undefined : oneOf(input.status, ACCOUNT_STATUSES, "status"),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export interface UpdateAccountInput {
  id: number;
  name?: string;
  type?: (typeof ACCOUNT_TYPES)[number];
  currency?: string;
  openingBalance?: number;
  status?: (typeof ACCOUNT_STATUSES)[number];
}

export function updateAccount(db: Db, input: UpdateAccountInput): Account {
  requireAccount(db, input.id);

  const patch: Partial<typeof accounts.$inferInsert> = { updatedAt: nowIso() };
  if (input.name !== undefined) patch.name = requiredText(input.name, "name");
  if (input.type !== undefined) patch.type = oneOf(input.type, ACCOUNT_TYPES, "type");
  if (input.currency !== undefined) patch.currency = requiredText(input.currency, "currency");
  if (input.openingBalance !== undefined)
    patch.openingBalance = normalizeAmount(input.openingBalance, "opening balance");
  if (input.status !== undefined) patch.status = oneOf(input.status, ACCOUNT_STATUSES, "status");

  return db
    .update(accounts)
    .set(patch)
    .where(eq(accounts.id, input.id))
    .returning()
    .get();
}

export function archiveAccount(db: Db, id: number): Account {
  requireAccount(db, id);
  return updateAccount(db, { id, status: "archived" });
}

export function unarchiveAccount(db: Db, id: number): Account {
  requireAccount(db, id);
  return updateAccount(db, { id, status: "active" });
}

export function getAccount(db: Db, id: number): Account {
  return requireAccount(db, id);
}

export function deleteAccount(db: Db, id: number): void {
  requireAccount(db, id);
  db.delete(accounts).where(eq(accounts.id, id)).run();
}

export function listAccounts(db: Db, status?: (typeof ACCOUNT_STATUSES)[number]): Account[] {
  return db
    .select()
    .from(accounts)
    .where(status ? eq(accounts.status, status) : undefined)
    .orderBy(accounts.createdAt, accounts.id)
    .all();
}

/* --------------------------------- categories ------------------------------ */

export interface CreateCategoryInput {
  name: string;
  kind: (typeof CATEGORY_KINDS)[number];
  color?: string;
}

export function createCategory(db: Db, input: CreateCategoryInput): Category {
  return db
    .insert(categories)
    .values({
      name: requiredText(input.name, "name"),
      kind: oneOf(input.kind, CATEGORY_KINDS, "kind"),
      color: input.color === undefined ? undefined : normalizeColor(input.color),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export interface UpdateCategoryInput {
  id: number;
  name?: string;
  kind?: (typeof CATEGORY_KINDS)[number];
  color?: string;
}

export function updateCategory(db: Db, input: UpdateCategoryInput): Category {
  requireCategory(db, input.id);

  const patch: Partial<typeof categories.$inferInsert> = { updatedAt: nowIso() };
  if (input.name !== undefined) patch.name = requiredText(input.name, "name");
  if (input.kind !== undefined) patch.kind = oneOf(input.kind, CATEGORY_KINDS, "kind");
  if (input.color !== undefined) patch.color = normalizeColor(input.color);

  return db
    .update(categories)
    .set(patch)
    .where(eq(categories.id, input.id))
    .returning()
    .get();
}

export function getCategory(db: Db, id: number): Category {
  return requireCategory(db, id);
}

export function deleteCategory(db: Db, id: number): void {
  requireCategory(db, id);
  db.delete(categories).where(eq(categories.id, id)).run();
}

export function listCategories(db: Db, kind?: (typeof CATEGORY_KINDS)[number]): Category[] {
  return db
    .select()
    .from(categories)
    .where(kind ? eq(categories.kind, kind) : undefined)
    .orderBy(categories.kind, categories.name)
    .all();
}

/* ------------------------------- transactions ------------------------------ */

export interface CreateTransactionInput {
  accountId: number;
  amount: number;
  date: string;
  description?: string;
  categoryId?: number | null;
  status?: (typeof TRANSACTION_STATUSES)[number];
}

export function createTransaction(db: Db, input: CreateTransactionInput): Transaction {
  requireAccount(db, input.accountId);

  const amount = normalizeAmount(input.amount, "amount");
  const date = normalizeDate(input.date);

  let categoryId: number | null | undefined = undefined;
  if (input.categoryId !== undefined) {
    if (input.categoryId === null) {
      categoryId = null;
    } else {
      const category = requireCategory(db, input.categoryId);
      validateAmountSign(amount, category.kind);
      categoryId = category.id;
    }
  }

  const status =
    input.status === undefined ? undefined : oneOf(input.status, TRANSACTION_STATUSES, "status");

  return db
    .insert(transactions)
    .values({
      accountId: input.accountId,
      amount,
      date,
      description: optionalText(input.description, "description") ?? "",
      categoryId,
      status,
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export interface UpdateTransactionInput {
  id: number;
  accountId?: number;
  amount?: number;
  date?: string;
  description?: string;
  categoryId?: number | null;
  status?: (typeof TRANSACTION_STATUSES)[number];
}

export function updateTransaction(db: Db, input: UpdateTransactionInput): Transaction {
  const existing = requireTransaction(db, input.id);

  const patch: Partial<typeof transactions.$inferInsert> = { updatedAt: nowIso() };

  if (input.accountId !== undefined) {
    requireAccount(db, input.accountId);
    patch.accountId = input.accountId;
  }
  if (input.amount !== undefined) patch.amount = normalizeAmount(input.amount, "amount");
  if (input.date !== undefined) patch.date = normalizeDate(input.date);
  if (input.description !== undefined)
    patch.description = optionalText(input.description, "description") ?? "";

  const nextAmount = input.amount !== undefined ? patch.amount! : existing.amount;
  if (input.categoryId !== undefined) {
    if (input.categoryId === null) {
      patch.categoryId = null;
    } else {
      const category = requireCategory(db, input.categoryId);
      validateAmountSign(nextAmount, category.kind);
      patch.categoryId = category.id;
    }
  } else if (input.amount !== undefined) {
    // Re-validate sign against existing category if amount changed.
    if (existing.categoryId !== null) {
      const category = requireCategory(db, existing.categoryId);
      validateAmountSign(nextAmount, category.kind);
    }
  }

  if (input.status !== undefined)
    patch.status = oneOf(input.status, TRANSACTION_STATUSES, "status");

  return db
    .update(transactions)
    .set(patch)
    .where(eq(transactions.id, input.id))
    .returning()
    .get();
}

export function getTransaction(db: Db, id: number): Transaction {
  return requireTransaction(db, id);
}

export function deleteTransaction(db: Db, id: number): void {
  requireTransaction(db, id);
  db.delete(transactions).where(eq(transactions.id, id)).run();
}

/* ---------------------------------- queries -------------------------------- */

export interface ListTransactionsFilters {
  accountId?: number;
  categoryId?: number | null;
  startDate?: string;
  endDate?: string;
  status?: (typeof TRANSACTION_STATUSES)[number];
}

export function listTransactions(db: Db, filters: ListTransactionsFilters = {}): Transaction[] {
  const conditions: (SQL | undefined)[] = [];
  if (filters.accountId !== undefined) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.categoryId !== undefined) {
    if (filters.categoryId === null) conditions.push(isNull(transactions.categoryId));
    else conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters.startDate !== undefined) conditions.push(gte(transactions.date, normalizeDate(filters.startDate)));
  if (filters.endDate !== undefined) conditions.push(lte(transactions.date, normalizeDate(filters.endDate)));
  if (filters.status !== undefined) conditions.push(eq(transactions.status, filters.status));

  const where = conditions.filter((c): c is SQL => c !== undefined);
  return db
    .select()
    .from(transactions)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(transactions.date, transactions.id)
    .all();
}

export function accountBalance(db: Db, accountId: number): number {
  requireAccount(db, accountId);
  const account = requireAccount(db, accountId);
  const cleared = db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.status, "cleared")))
    .get();
  return account.openingBalance + (cleared?.total ?? 0);
}

export function totalBalance(db: Db): number {
  const accountsList = listAccounts(db, "active");
  return accountsList.reduce((sum, account) => sum + accountBalance(db, account.id), 0);
}

export function recentTransactions(db: Db, limit = 10): Transaction[] {
  return db
    .select()
    .from(transactions)
    .orderBy(sql`${transactions.date} desc`, transactions.id)
    .limit(limit)
    .all();
}

/* --------------------------------- helpers --------------------------------- */

function normalizeAmount(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new ValidationError(`Invalid ${field}: expected an integer (cents).`);
  }
  return n;
}

function normalizeColor(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    throw new ValidationError(
      `Invalid color: ${JSON.stringify(value)}. Expected #rrggbb.`,
    );
  }
  return value.trim().toLowerCase();
}

function validateAmountSign(amount: number, kind: (typeof CATEGORY_KINDS)[number]): void {
  if (kind === "income" && amount <= 0) {
    throw new ValidationError("An income category requires a positive amount.");
  }
  if (kind === "expense" && amount >= 0) {
    throw new ValidationError("An expense category requires a negative amount.");
  }
}
