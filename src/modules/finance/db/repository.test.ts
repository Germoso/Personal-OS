import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

/* --------------------------------- accounts -------------------------------- */

describe("createAccount (S11)", () => {
  it("creates an account with defaults", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    expect(account).toMatchObject({
      name: "Banco",
      type: "checking",
      currency: "ARS",
      openingBalance: 0,
      status: "active",
    });
  });

  it("creates a savings account with opening balance", () => {
    const account = repo.createAccount(db, {
      name: "Ahorro",
      type: "savings",
      openingBalance: 100000,
    });
    expect(account).toMatchObject({ type: "savings", openingBalance: 100000 });
  });

  it("rejects a blank name", () => {
    expect(() => repo.createAccount(db, { name: "   " })).toThrow(/name/i);
  });
});

describe("accountBalance (S14)", () => {
  it("returns opening balance when no transactions", () => {
    const account = repo.createAccount(db, { name: "Banco", openingBalance: 5000 });
    expect(repo.accountBalance(db, account.id)).toBe(5000);
  });

  it("adds cleared transactions to opening balance", () => {
    const account = repo.createAccount(db, { name: "Banco", openingBalance: 1000 });
    repo.createTransaction(db, { accountId: account.id, amount: 500, date: "2026-10-20" });
    repo.createTransaction(db, { accountId: account.id, amount: -200, date: "2026-10-21" });
    expect(repo.accountBalance(db, account.id)).toBe(1300);
  });

  it("ignores pending transactions", () => {
    const account = repo.createAccount(db, { name: "Banco", openingBalance: 1000 });
    repo.createTransaction(db, { accountId: account.id, amount: 500, date: "2026-10-20", status: "pending" });
    expect(repo.accountBalance(db, account.id)).toBe(1000);
  });
});

describe("totalBalance (S14)", () => {
  it("sums active account balances", () => {
    const a1 = repo.createAccount(db, { name: "Banco", openingBalance: 1000 });
    const a2 = repo.createAccount(db, { name: "Efectivo", openingBalance: 500 });
    repo.createTransaction(db, { accountId: a1.id, amount: 200, date: "2026-10-20" });
    expect(repo.totalBalance(db)).toBe(1700);
  });

  it("excludes archived accounts", () => {
    const account = repo.createAccount(db, { name: "Banco", openingBalance: 1000 });
    repo.archiveAccount(db, account.id);
    expect(repo.totalBalance(db)).toBe(0);
  });
});

describe("updateAccount / deleteAccount (S11)", () => {
  it("updates account fields", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const updated = repo.updateAccount(db, { id: account.id, name: "Banco Nuevo", type: "savings" });
    expect(updated).toMatchObject({ name: "Banco Nuevo", type: "savings" });
  });

  it("archives and unarchives", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    repo.archiveAccount(db, account.id);
    expect(repo.getAccount(db, account.id).status).toBe("archived");
    repo.unarchiveAccount(db, account.id);
    expect(repo.getAccount(db, account.id).status).toBe("active");
  });

  it("deletes an account and its transactions", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-10-20" });
    repo.deleteAccount(db, account.id);
    expect(repo.listAccounts(db)).toEqual([]);
    expect(repo.listTransactions(db)).toEqual([]);
  });

  it("rejects unknown id", () => {
    expect(() => repo.updateAccount(db, { id: 999, name: "X" })).toThrow(/account/i);
    expect(() => repo.deleteAccount(db, 999)).toThrow(/account/i);
  });
});

/* -------------------------------- categories ------------------------------- */

describe("createCategory (S12)", () => {
  it("creates a category with defaults", () => {
    const category = repo.createCategory(db, { name: "Comida", kind: "expense" });
    expect(category).toMatchObject({ name: "Comida", kind: "expense", color: "#e8a653" });
  });

  it("rejects a blank name", () => {
    expect(() => repo.createCategory(db, { name: "   ", kind: "expense" })).toThrow(/name/i);
  });

  it("rejects invalid kind", () => {
    expect(() => repo.createCategory(db, { name: "X", kind: "foo" as never })).toThrow(/kind/i);
  });
});

describe("listCategories (S12)", () => {
  it("filters by kind", () => {
    repo.createCategory(db, { name: "Sueldo", kind: "income" });
    repo.createCategory(db, { name: "Comida", kind: "expense" });
    expect(repo.listCategories(db, "income")).toHaveLength(1);
    expect(repo.listCategories(db)).toHaveLength(2);
  });
});

describe("updateCategory / deleteCategory (S12)", () => {
  it("updates category fields", () => {
    const category = repo.createCategory(db, { name: "Comida", kind: "expense" });
    const updated = repo.updateCategory(db, { id: category.id, name: "Comida fuera", color: "#ff0000" });
    expect(updated).toMatchObject({ name: "Comida fuera", color: "#ff0000" });
  });

  it("deletes a category and nullifies transactions", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const category = repo.createCategory(db, { name: "Comida", kind: "expense" });
    repo.createTransaction(db, { accountId: account.id, amount: -500, date: "2026-10-20", categoryId: category.id });
    repo.deleteCategory(db, category.id);
    expect(repo.listTransactions(db)[0].categoryId).toBeNull();
  });
});

/* ------------------------------- transactions ------------------------------ */

describe("createTransaction (S13)", () => {
  it("creates a cleared transaction", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const tx = repo.createTransaction(db, { accountId: account.id, amount: 1000, date: "2026-10-20", description: "Sueldo" });
    expect(tx).toMatchObject({ accountId: account.id, amount: 1000, date: "2026-10-20", description: "Sueldo", status: "cleared", categoryId: null });
  });

  it("rejects unknown account", () => {
    expect(() => repo.createTransaction(db, { accountId: 999, amount: 100, date: "2026-10-20" })).toThrow(/account/i);
  });

  it("rejects invalid date", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    expect(() => repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-02-30" })).toThrow(/date/i);
  });

  it("rejects income category with negative amount", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const category = repo.createCategory(db, { name: "Sueldo", kind: "income" });
    expect(() => repo.createTransaction(db, { accountId: account.id, amount: -100, date: "2026-10-20", categoryId: category.id })).toThrow(/income/i);
  });

  it("rejects expense category with positive amount", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const category = repo.createCategory(db, { name: "Comida", kind: "expense" });
    expect(() => repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-10-20", categoryId: category.id })).toThrow(/expense/i);
  });
});

describe("updateTransaction (S13)", () => {
  it("updates transaction fields", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const tx = repo.createTransaction(db, { accountId: account.id, amount: 1000, date: "2026-10-20" });
    const updated = repo.updateTransaction(db, { id: tx.id, amount: 1500, description: "Ajuste" });
    expect(updated).toMatchObject({ amount: 1500, description: "Ajuste" });
  });

  it("rejects invalid category sign on update", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const category = repo.createCategory(db, { name: "Comida", kind: "expense" });
    const tx = repo.createTransaction(db, { accountId: account.id, amount: -500, date: "2026-10-20", categoryId: category.id });
    expect(() => repo.updateTransaction(db, { id: tx.id, amount: 500 })).toThrow(/expense/i);
  });

  it("rejects unknown id", () => {
    expect(() => repo.updateTransaction(db, { id: 999, amount: 100 })).toThrow(/transaction/i);
  });
});

describe("deleteTransaction (S13)", () => {
  it("deletes a transaction", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    const tx = repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-10-20" });
    repo.deleteTransaction(db, tx.id);
    expect(repo.listTransactions(db)).toEqual([]);
  });

  it("rejects unknown id", () => {
    expect(() => repo.deleteTransaction(db, 999)).toThrow(/transaction/i);
  });
});

describe("listTransactions (S13)", () => {
  it("filters by account", () => {
    const a1 = repo.createAccount(db, { name: "Banco" });
    const a2 = repo.createAccount(db, { name: "Efectivo" });
    repo.createTransaction(db, { accountId: a1.id, amount: 100, date: "2026-10-20" });
    repo.createTransaction(db, { accountId: a2.id, amount: 200, date: "2026-10-21" });
    expect(repo.listTransactions(db, { accountId: a1.id })).toHaveLength(1);
  });

  it("filters by date range", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-10-18" });
    repo.createTransaction(db, { accountId: account.id, amount: 200, date: "2026-10-20" });
    repo.createTransaction(db, { accountId: account.id, amount: 300, date: "2026-10-22" });
    expect(repo.listTransactions(db, { startDate: "2026-10-19", endDate: "2026-10-21" })).toHaveLength(1);
  });

  it("filters by status", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-10-20", status: "cleared" });
    repo.createTransaction(db, { accountId: account.id, amount: 200, date: "2026-10-21", status: "pending" });
    expect(repo.listTransactions(db, { status: "pending" })).toHaveLength(1);
  });
});

describe("recentTransactions (S15)", () => {
  it("returns latest transactions first", () => {
    const account = repo.createAccount(db, { name: "Banco" });
    repo.createTransaction(db, { accountId: account.id, amount: 100, date: "2026-10-18" });
    repo.createTransaction(db, { accountId: account.id, amount: 200, date: "2026-10-22" });
    const recent = repo.recentTransactions(db, 1);
    expect(recent).toHaveLength(1);
    expect(recent[0].date).toBe("2026-10-22");
  });
});
