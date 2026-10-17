import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import { accounts, categories, transactions } from "./schema";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("accounts table (S11)", () => {
  it("applies defaults: checking type, ARS currency, zero opening balance", () => {
    db.insert(accounts).values({ name: "Banco" }).run();

    const row = db.select().from(accounts).all()[0];
    expect(row).toMatchObject({
      name: "Banco",
      type: "checking",
      currency: "ARS",
      openingBalance: 0,
    });
  });

  it("stores all account types", () => {
    for (const type of ["checking", "savings", "cash", "credit"] as const) {
      db.insert(accounts).values({ name: type, type }).run();
    }
    expect(db.select().from(accounts).all()).toHaveLength(4);
  });

  it("requires a name", () => {
    expect(() => db.insert(accounts).values({ name: null } as never).run()).toThrow(/name/i);
  });

  it("stamps created and updated timestamps", () => {
    const account = db.insert(accounts).values({ name: "Sello" }).returning().get();
    expect(account.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(account.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("categories table (S12)", () => {
  it("applies default color", () => {
    db.insert(categories).values({ name: "Comida", kind: "expense" }).run();

    const row = db.select().from(categories).all()[0];
    expect(row).toMatchObject({
      name: "Comida",
      kind: "expense",
      color: "#6366f1",
    });
  });

  it("requires name and kind", () => {
    expect(() => db.insert(categories).values({ name: null, kind: "expense" } as never).run()).toThrow(/name/i);
    expect(() => db.insert(categories).values({ name: "X", kind: null } as never).run()).toThrow(/kind/i);
  });
});

describe("transactions table (S13)", () => {
  it("applies defaults: cleared status, empty description", () => {
    const account = db.insert(accounts).values({ name: "Banco" }).returning().get();
    db.insert(transactions)
      .values({ accountId: account.id, amount: 1000, date: "2026-10-20" })
      .run();

    const row = db.select().from(transactions).all()[0];
    expect(row).toMatchObject({
      accountId: account.id,
      amount: 1000,
      date: "2026-10-20",
      description: "",
      categoryId: null,
      status: "cleared",
    });
  });

  it("requires account, amount and date", () => {
    expect(() =>
      db.insert(transactions).values({ amount: 1000, date: "2026-10-20" } as never).run(),
    ).toThrow(/account/i);
    expect(() =>
      db.insert(transactions).values({ accountId: 1, date: "2026-10-20" } as never).run(),
    ).toThrow(/amount/i);
    expect(() =>
      db.insert(transactions).values({ accountId: 1, amount: 1000 } as never).run(),
    ).toThrow(/date/i);
  });

  it("cascades delete when account is removed", () => {
    const account = db.insert(accounts).values({ name: "Banco" }).returning().get();
    db.insert(transactions).values({ accountId: account.id, amount: 1000, date: "2026-10-20" }).run();
    db.delete(accounts).where(require("drizzle-orm").eq(accounts.id, account.id)).run();
    expect(db.select().from(transactions).all()).toEqual([]);
  });

  it("sets category to null when category is removed", () => {
    const account = db.insert(accounts).values({ name: "Banco" }).returning().get();
    const category = db.insert(categories).values({ name: "Comida", kind: "expense" }).returning().get();
    db.insert(transactions)
      .values({ accountId: account.id, amount: -500, date: "2026-10-20", categoryId: category.id })
      .run();
    db.delete(categories).where(require("drizzle-orm").eq(categories.id, category.id)).run();
    expect(db.select().from(transactions).all()[0].categoryId).toBeNull();
  });

  it("stamps created and updated timestamps", () => {
    const account = db.insert(accounts).values({ name: "Sello" }).returning().get();
    const tx = db
      .insert(transactions)
      .values({ accountId: account.id, amount: 100, date: "2026-10-20" })
      .returning()
      .get();
    expect(tx.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(tx.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
