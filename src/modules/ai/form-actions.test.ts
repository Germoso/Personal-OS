import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDb, type Db } from "@/db/client";

import { listActions, listMessages } from "@/modules/ai/db/repository";
import type { LLMResponse } from "@/modules/ai/llm/client";
import type { ToolResult } from "@/modules/ai/tools/registry";

import { confirmAction, rejectAction, sendMessage, setAutonomy, getAutonomy, type ChatDeps } from "./form-actions";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

const answer = (content: string): LLMResponse => ({ content, toolCalls: [] });
const toolCall = (name: string, args: Record<string, unknown>): LLMResponse => ({
  content: null,
  toolCalls: [{ id: "call_1", name, arguments: args }],
});
const execOk: (name: string, args: Record<string, unknown>) => Promise<ToolResult> = async () => ({
  ok: true,
  data: { done: true },
});

function deps(llm: (messages: never[], tools?: never) => Promise<LLMResponse>, execute = execOk): ChatDeps {
  return { db, llm: llm as never, execute };
}

describe("sendMessage (S37)", () => {
  it("creates a chat on first message and persists user + assistant", async () => {
    const llm = vi.fn(async () => answer("Hecho: tarea creada."));
    const result = await sendMessage({ chatId: null, content: "  crea una tarea  " }, deps(llm as never));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const messages = listMessages(db, result.data.chatId);
    expect(messages[0]).toMatchObject({ role: "user", content: "crea una tarea" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hecho: tarea creada." });
    expect(result.data.assistantContent).toBe("Hecho: tarea creada.");
  });

  it("appends to an existing chat when chatId is provided", async () => {
    const first = await sendMessage({ chatId: null, content: "hola" }, deps(vi.fn(async () => answer("hola!")) as never));
    if (!first.ok) throw new Error("first send failed");
    const second = await sendMessage(
      { chatId: first.data.chatId, content: "segundo mensaje" },
      deps(vi.fn(async () => answer("ok")) as never),
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const messages = listMessages(db, second.data.chatId);
    expect(messages).toHaveLength(4); // user, assistant, user, assistant
    expect(messages[2].content).toBe("segundo mensaje");
  });

  it("returns a pending confirmation for destructive tools under the default autonomy and stores the prompt", async () => {
    const llm = vi.fn(async () => toolCall("tasks_deleteTask", { id: 5 }));
    const execute = vi.fn(execOk);
    const result = await sendMessage({ chatId: null, content: "borra la tarea 5" }, deps(llm as never, execute));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending).toEqual({ tool: "tasks_deleteTask", args: { id: 5 } });
    expect(result.data.assistantContent).toBeNull();
    // The assistant message holds the confirmation marker.
    const messages = listMessages(db, result.data.chatId);
    expect(messages[1].content).toMatch(/^⏳ Confirmar acción: tasks_deleteTask/);
    expect(execute).not.toHaveBeenCalled();
    // Audit log records the pending action.
    expect(listActions(db, result.data.chatId)[0]).toMatchObject({ tool: "tasks_deleteTask", status: "pending" });
  });
});

describe("confirmAction / rejectAction (S37)", () => {
  it("confirms and executes a previously pending action", async () => {
    const send = await sendMessage({ chatId: null, content: "borra la tarea 5" }, deps(vi.fn(async () => toolCall("tasks_deleteTask", { id: 5 })) as never));
    if (!send.ok) throw new Error("send failed");
    const chatId = send.data.chatId;
    const llm = vi.fn(async () => answer("Listo, borrada."));
    const execute = vi.fn(execOk);
    const confirmed = await confirmAction({ chatId, tool: "tasks_deleteTask", args: { id: 5 } }, deps(llm as never, execute));
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(execute).toHaveBeenCalledWith("tasks_deleteTask", { id: 5 });
    const messages = listMessages(db, chatId);
    expect(messages[messages.length - 1]!).toMatchObject({ role: "assistant", content: "Listo, borrada." });
    expect(listActions(db, chatId)[0].status).toBe("executed");
  });

  it("rejects the pending action and records it in the audit log", async () => {
    const send = await sendMessage({ chatId: null, content: "borra la tarea 5" }, deps(vi.fn(async () => toolCall("tasks_deleteTask", { id: 5 })) as never));
    if (!send.ok) throw new Error("send failed");
    const chatId = send.data.chatId;
    const rejected = await rejectAction(chatId, { db });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(listActions(db, chatId)[0].status).toBe("rejected");
    const messages = listMessages(db, chatId);
    expect(messages[messages.length - 1]!.content).toBe("Ok, no hago nada.");
  });
});

describe("autonomy settings (S33)", () => {
  it("defaults to ask-on-delete", async () => {
    const result = await getAutonomy({ db });
    expect(result.ok && result.data.level).toBe("ask-on-delete");
  });

  it("round-trips a configured level", async () => {
    const applied = await setAutonomy("autonomous", { db });
    expect(applied.ok).toBe(true);
    const read = await getAutonomy({ db });
    expect(read.ok && read.data.level).toBe("autonomous");
  });

  it("rejects unknown levels", async () => {
    const result = await setAutonomy("nope" as never, { db });
    expect(result.ok).toBe(false);
  });
});

describe("sendMessage validation (S37)", () => {
  it("rejects empty content", async () => {
    const result = await sendMessage({ chatId: null, content: "   " }, deps(vi.fn(async () => answer("x")) as never));
    expect(result.ok).toBe(false);
  });
});