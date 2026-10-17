import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import { aiActions, aiChats, aiMessages, aiSettings } from "./schema";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("ai_chats table (S34)", () => {
  it("applies default title and stamps timestamps", () => {
    const chat = db.insert(aiChats).values({} as never).returning().get();
    expect(chat.title).toBe("Nueva conversación");
    expect(chat.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(chat.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("allows an explicit title", () => {
    const chat = db.insert(aiChats).values({ title: "Planificar semana" }).returning().get();
    expect(chat.title).toBe("Planificar semana");
  });
});

describe("ai_messages table (S34)", () => {
  it("requires chat, role and content", () => {
    expect(() => db.insert(aiMessages).values({ role: "user", content: "hola" } as never).run()).toThrow(/chat/i);
    expect(() => db.insert(aiMessages).values({ chatId: 1, content: "hola" } as never).run()).toThrow(/role/i);
    expect(() => db.insert(aiMessages).values({ chatId: 1, role: "user" } as never).run()).toThrow(/content/i);
  });

  it("stores user and assistant messages", () => {
    const chat = db.insert(aiChats).values({} as never).returning().get();
    for (const role of ["user", "assistant"] as const) {
      db.insert(aiMessages).values({ chatId: chat.id, role, content: `msg-${role}` }).run();
    }
    expect(db.select().from(aiMessages).all()).toHaveLength(2);
  });

  it("cascades delete when chat is removed", () => {
    const chat = db.insert(aiChats).values({} as never).returning().get();
    db.insert(aiMessages).values({ chatId: chat.id, role: "user", content: "hola" }).run();
    db.delete(aiChats).where(eq(aiChats.id, chat.id)).run();
    expect(db.select().from(aiMessages).all()).toEqual([]);
  });
});

describe("ai_settings table (S34)", () => {
  it("stores key/value pairs with a unique key", () => {
    db.insert(aiSettings).values({ key: "autonomy", value: "ask-on-delete" }).run();
    expect(db.select().from(aiSettings).all()[0]).toMatchObject({
      key: "autonomy",
      value: "ask-on-delete",
    });
    expect(() =>
      db.insert(aiSettings).values({ key: "autonomy", value: "autonomous" }).run(),
    ).toThrow(/unique/i);
  });
});

describe("ai_actions table (S34)", () => {
  it("stores tool execution metadata with a chat reference", () => {
    const chat = db.insert(aiChats).values({} as never).returning().get();
    db.insert(aiActions)
      .values({
        chatId: chat.id,
        tool: "tasks.deleteTask",
        args: JSON.stringify({ id: 3 }),
        status: "executed",
      })
      .run();
    const row = db.select().from(aiActions).all()[0];
    expect(row).toMatchObject({
      chatId: chat.id,
      tool: "tasks.deleteTask",
      args: JSON.stringify({ id: 3 }),
      status: "executed",
    });
    expect(row.result).toBeNull();
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("stores result and status changes", () => {
    const chat = db.insert(aiChats).values({} as never).returning().get();
    db.insert(aiActions)
      .values({ chatId: chat.id, tool: "tasks.completeTask", args: "{}", status: "confirmed", result: JSON.stringify({ ok: true }) })
      .run();
    expect(db.select().from(aiActions).all()[0].result).toBe(JSON.stringify({ ok: true }));
  });

  it("cascades delete when chat is removed", () => {
    const chat = db.insert(aiChats).values({} as never).returning().get();
    db.insert(aiActions).values({ chatId: chat.id, tool: "x", args: "{}", status: "executed" }).run();
    db.delete(aiChats).where(eq(aiChats.id, chat.id)).run();
    expect(db.select().from(aiActions).all()).toEqual([]);
  });
});