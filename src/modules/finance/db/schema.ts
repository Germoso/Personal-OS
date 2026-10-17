import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "@/db/columns";

export const ACCOUNT_TYPES = ["checking", "savings", "cash", "credit"] as const;
export const ACCOUNT_STATUSES = ["active", "archived"] as const;
export const TRANSACTION_STATUSES = ["cleared", "pending"] as const;
export const CATEGORY_KINDS = ["income", "expense"] as const;

export const DEFAULT_ACCOUNT_COLOR = "#6366f1";
export const DEFAULT_CATEGORY_COLOR = "#6366f1";

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type", { enum: ACCOUNT_TYPES }).notNull().default("checking"),
    currency: text("currency").notNull().default("ARS"),
    openingBalance: integer("opening_balance").notNull().default(0),
    status: text("status", { enum: ACCOUNT_STATUSES }).notNull().default("active"),
    ...timestamps,
  },
  (table) => [index("accounts_type_idx").on(table.type)],
);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: CATEGORY_KINDS }).notNull(),
  color: text("color").notNull().default(DEFAULT_CATEGORY_COLOR),
  ...timestamps,
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    date: text("date").notNull(),
    description: text("description").notNull().default(""),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: TRANSACTION_STATUSES })
      .notNull()
      .default("cleared"),
    ...timestamps,
  },
  (table) => [
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_date_idx").on(table.date),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
);
