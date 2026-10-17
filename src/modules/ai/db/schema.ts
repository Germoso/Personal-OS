import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { timestamps } from "@/db/columns";

/**
 * AI assistant conversations. One row per chat; messages live in ai_messages.
 */
export const aiChats = sqliteTable("ai_chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("Nueva conversación"),
  ...timestamps,
});

/**
 * Messages inside a chat. role is "user" (the human) or "assistant" (the AI).
 */
export const aiMessages = sqliteTable("ai_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => aiChats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  ...timestamps,
});

/**
 * Key/value application settings for the AI assistant (e.g. autonomy level:
 * ask-on-delete | ask-on-mutation | autonomous).
 */
export const aiSettings = sqliteTable(
  "ai_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("ai_settings_key_idx").on(table.key)],
);

/**
 * Audit log of every tool call the assistant executes (or that awaits
 * confirmation). args/result are JSON-encoded strings; status is one of
 * executed | confirmed | rejected | failed | pending.
 */
export const aiActions = sqliteTable("ai_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => aiChats.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  args: text("args").notNull().default("{}"),
  status: text("status", {
    enum: ["executed", "confirmed", "rejected", "failed", "pending"],
  })
    .notNull()
    .default("executed"),
  result: text("result"),
  ...timestamps,
});