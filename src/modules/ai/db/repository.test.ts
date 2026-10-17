import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";

import {
  addMessage,
  createChat,
  getSetting,
  listActions,
  listChats,
  listMessages,
  logAction,
  requireChat,
  setSetting,
  updateActionOutcome,
} from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("chats (S34)", () => {
  it("creates a chat with default title", () => {
    const chat = createChat(db, {});
    expect(chat.title).toBe("Nueva conversación");
  });

  it("creates a chat with explicit title", () => {
    const chat = createChat(db, { title: "  Planificar semana  " });
    expect(chat.title).toBe("Planificar semana");
  });

  it("rejects empty titles", () => {
    expect(() => createChat(db, { title: "   " })).toThrow(ValidationError);
  });

  it("orders chats by most recently updated first", () => {
    const old = createChat(db, { title: "Vieja" });
    const fresh = createChat(db, { title: "Nueva" });
    addMessage(db, { chatId: old.id, role: "user", content: "hola" });
    const chats = listChats(db);
    expect(chats.map((c) => c.title)).toEqual(["Vieja", "Nueva"]);
    expect(chats[0].updatedAt >= chats[1].updatedAt).toBe(true);
    void fresh;
  });

  it("requireChat throws NotFoundError for unknown ids", () => {
    expect(() => requireChat(db, 999)).toThrow(NotFoundError);
  });
});

describe("messages (S34)", () => {
  it("adds a user and an assistant message and lists them in order", () => {
    const chat = createChat(db, {});
    addMessage(db, { chatId: chat.id, role: "user", content: "  Hola  " });
    addMessage(db, { chatId: chat.id, role: "assistant", content: "Hola!" });
    const messages = listMessages(db, chat.id);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Hola" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hola!" });
  });

  it("bumps the chat updatedAt when a message is added", () => {
    const chat = createChat(db, {});
    const before = chat.updatedAt;
    addMessage(db, { chatId: chat.id, role: "user", content: "hola" });
    expect(requireChat(db, chat.id).updatedAt >= before).toBe(true);
  });

  it("rejects invalid roles and empty content", () => {
    const chat = createChat(db, {});
    expect(() => addMessage(db, { chatId: chat.id, role: "system" as never, content: "x" })).toThrow(
      ValidationError,
    );
    expect(() => addMessage(db, { chatId: chat.id, role: "user", content: "  " })).toThrow(
      ValidationError,
    );
  });

  it("rejects messages for unknown chats", () => {
    expect(() => addMessage(db, { chatId: 999, role: "user", content: "x" })).toThrow(NotFoundError);
  });
});

describe("settings (S34)", () => {
  it("stores and reads a setting", () => {
    setSetting(db, "autonomy", "ask-on-delete");
    expect(getSetting(db, "autonomy")).toBe("ask-on-delete");
    expect(getSetting(db, "missing")).toBeNull();
  });

  it("upserts on repeated writes", () => {
    setSetting(db, "autonomy", "ask-on-delete");
    setSetting(db, "autonomy", "autonomous");
    expect(getSetting(db, "autonomy")).toBe("autonomous");
  });

  it("rejects empty keys and values", () => {
    expect(() => setSetting(db, "  ", "x")).toThrow(ValidationError);
    expect(() => setSetting(db, "autonomy", "  ")).toThrow(ValidationError);
  });
});

describe("action log (S34)", () => {
  it("records an executed action and lists actions newest first", () => {
    const chat = createChat(db, {});
    logAction(db, { chatId: chat.id, tool: "tasks.createTask", args: "{}", status: "executed" });
    logAction(db, { chatId: chat.id, tool: "tasks.deleteTask", args: '{"id":3}', status: "pending" });
    const actions = listActions(db, chat.id);
    expect(actions).toHaveLength(2);
    expect(actions[0].tool).toBe("tasks.deleteTask");
    expect(actions[1].status).toBe("executed");
  });

  it("validates tool, status and JSON args", () => {
    const chat = createChat(db, {});
    expect(() => logAction(db, { chatId: chat.id, tool: "  ", args: "{}", status: "executed" })).toThrow(
      ValidationError,
    );
    expect(() => logAction(db, { chatId: chat.id, tool: "x.y", args: "{}", status: "nope" as never })).toThrow(
      ValidationError,
    );
    expect(() => logAction(db, { chatId: chat.id, tool: "x.y", args: "not-json", status: "executed" })).toThrow(
      ValidationError,
    );
  });

  it("rejects actions for unknown chats and updates outcomes", () => {
    expect(() => logAction(db, { chatId: 999, tool: "x.y", args: "{}", status: "executed" })).toThrow(
      NotFoundError,
    );
    const chat = createChat(db, {});
    const action = logAction(db, { chatId: chat.id, tool: "x.y", args: "{}", status: "pending" });
    const updated = updateActionOutcome(db, action.id, "confirmed", '{"ok":true}');
    expect(updated.status).toBe("confirmed");
    expect(updated.result).toBe('{"ok":true}');
  });
});