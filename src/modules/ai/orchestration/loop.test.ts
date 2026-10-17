import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDb, type Db } from "@/db/client";

import { type ChatMessage, type LLMResponse, type LLMTool } from "@/modules/ai/llm/client";
import { createChat, listActions } from "@/modules/ai/db/repository";

import { runTurn } from "./loop";

let db: Db;
let chatId: number;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  chatId = createChat(db, { title: "Test" }).id;
});

type LLMStub = (messages: ChatMessage[], tools?: LLMTool[]) => Promise<LLMResponse>;
type ExecStub = (name: string, args: Record<string, unknown>) => Promise<{ ok: boolean; data?: unknown; error?: string }>;

const answer = (content: string): LLMResponse => ({ content, toolCalls: [] });
const toolCall = (name: string, args: Record<string, unknown>): LLMResponse => ({
  content: null,
  toolCalls: [{ id: "call_1", name, arguments: args }],
});

function makeStub(llm: LLMStub, execute: ExecStub) {
  return () => runTurn(db, {
    chatId,
    messages: [{ role: "user", content: "hazme una tarea" }],
    autonomy: "ask-on-delete",
    llm,
    execute,
  });
}

const noopExec: ExecStub = async (name, args) => ({ ok: true, data: { done: name, ...args } });

describe("runTurn loop (S36)", () => {
  it("returns the assistant text when no tool is requested", async () => {
    const llm = vi.fn().mockResolvedValue(answer("Listo."));
    const result = await makeStub(llm, noopExec)();
    expect(result.content).toBe("Listo.");
    expect(result.requiresConfirmation).toBeNull();
    expect(result.executed).toEqual([]);
  });

  it("executes a non-destructive tool and feeds the result back to the LLM", async () => {
    const llm = vi
      .fn()
      .mockResolvedValueOnce(toolCall("tasks.createTask", { title: "Comprar pan" }))
      .mockResolvedValueOnce(answer("Tarea creada."));
    const result = await makeStub(llm, noopExec)();
    expect(result.executed).toEqual([{ name: "tasks.createTask", ok: true }]);
    expect(llm).toHaveBeenCalledTimes(2);
    // The second call includes the assistant tool-call message and the tool result.
    const secondMessages = llm.mock.calls[1][0] as ChatMessage[];
    expect(secondMessages.some((m) => m.role === "tool" && m.toolCallId === "call_1")).toBe(true);
    expect(result.content).toBe("Tarea creada.");
  });

  it("asks for confirmation on a destructive tool under ask-on-delete and does not execute it", async () => {
    const llm = vi
      .fn()
      .mockResolvedValueOnce(toolCall("tasks.deleteTask", { id: 5 }))
      .mockResolvedValue(answer("nunca debería llegar"));
    const execute = vi.fn(noopExec);
    const result = await makeStub(llm, execute)();
    expect(result.requiresConfirmation).toEqual({ tool: "tasks.deleteTask", args: { id: 5 } });
    expect(execute).not.toHaveBeenCalled();
    expect(llm).toHaveBeenCalledTimes(1);
    // The pending action is logged with status "pending".
    expect(listActions(db, chatId)[0]).toMatchObject({ tool: "tasks.deleteTask", status: "pending" });
  });

  it("executes destructive tools without confirmation under autonomous autonomy", async () => {
    const llm = vi
      .fn()
      .mockResolvedValueOnce(toolCall("tasks.deleteTask", { id: 5 }))
      .mockResolvedValue(answer("Borrada."));
    const result = await runTurn(db, {
      chatId,
      messages: [{ role: "user", content: "borra la tarea 5" }],
      autonomy: "autonomous",
      llm,
      execute: noopExec,
    });
    expect(result.executed).toEqual([{ name: "tasks.deleteTask", ok: true }]);
    expect(result.requiresConfirmation).toBeNull();
  });

  it("asks for confirmation on any mutation under ask-on-mutation, but not on reads", async () => {
    const mutating = vi.fn().mockResolvedValue(toolCall("tasks.updateTask", { id: 1, title: "x" }));
    const mutatingResult = await runTurn(db, {
      chatId,
      messages: [{ role: "user", content: "renombra la tarea 1" }],
      autonomy: "ask-on-mutation",
      llm: mutating,
      execute: noopExec,
    });
    expect(mutatingResult.requiresConfirmation).toEqual({ tool: "tasks.updateTask", args: { id: 1, title: "x" } });

    const read = vi
      .fn()
      .mockResolvedValueOnce(toolCall("finance.totalBalance", {}))
      .mockResolvedValue(answer("Tu saldo total es 12345."));
    const readResult = await runTurn(db, {
      chatId,
      messages: [{ role: "user", content: "cuánto tengo?" }],
      autonomy: "ask-on-mutation",
      llm: read,
      execute: noopExec,
    });
    expect(readResult.requiresConfirmation).toBeNull();
    expect(readResult.executed).toEqual([{ name: "finance.totalBalance", ok: true }]);
  });

  it("feeds unknown tool errors back to the LLM so it can correct", async () => {
    const llm = vi
      .fn()
      .mockResolvedValueOnce(toolCall("nope.nope", {}))
      .mockResolvedValueOnce(answer("Me equivoqué, disculpa."));
    const result = await makeStub(llm, noopExec)();
    const secondMessages = llm.mock.calls[1][0] as ChatMessage[];
    expect(secondMessages.some((m) => m.role === "tool" && /unknown tool/i.test(m.content ?? ""))).toBe(true);
    expect(result.content).toBe("Me equivoqué, disculpa.");
  });

  it("executes a pre-authorized tool and then answers without another tool call", async () => {
    const llm = vi.fn().mockResolvedValue(answer("Confirmado y ejecutado."));
    const execute = vi.fn(noopExec);
    const result = await runTurn(db, {
      chatId,
      messages: [{ role: "user", content: "sí, borra" }],
      autonomy: "ask-on-delete",
      preAuthorized: [{ name: "tasks.deleteTask", args: { id: 5 } }],
      llm,
      execute,
    });
    expect(execute).toHaveBeenCalledWith("tasks.deleteTask", { id: 5 });
    expect(result.executed).toEqual([{ name: "tasks.deleteTask", ok: true }]);
    expect(result.content).toBe("Confirmado y ejecutado.");
    // No tools were offered in the post-confirmation call.
    expect(llm.mock.calls[0][1]).toBeUndefined();
    expect(listActions(db, chatId)[0]).toMatchObject({ tool: "tasks.deleteTask", status: "executed" });
  });

  it("propagates tool failures as structured results the model can read", async () => {
    const llm = vi
      .fn()
      .mockResolvedValueOnce(toolCall("finance.createTransaction", { accountId: 1, amount: 100 }))
      .mockResolvedValue(answer("Lo intenté pero falló."));
    const execute: ExecStub = async () => ({ ok: false, error: "Unknown account id: 1." });
    const result = await runTurn(db, {
      chatId,
      messages: [{ role: "user", content: "carga una transacción" }],
      autonomy: "ask-on-delete",
      llm,
      execute,
    });
    const secondMessages = llm.mock.calls[1][0] as ChatMessage[];
    expect(secondMessages.some((m) => m.role === "tool" && /unknown account id/i.test(m.content ?? ""))).toBe(true);
    expect(result.executed).toEqual([
      { name: "finance.createTransaction", ok: false, error: "Unknown account id: 1." },
    ]);
  });

  it("bounded iterations: stops after maxIterations tool rounds", async () => {
    const llm = vi.fn().mockResolvedValue(toolCall("tasks.createTask", { title: "x" }));
    const result = await runTurn(db, {
      chatId,
      messages: [{ role: "user", content: "repítelo" }],
      autonomy: "autonomous",
      maxIterations: 2,
      llm,
      execute: noopExec,
    });
    expect(llm).toHaveBeenCalledTimes(2);
    expect(result.content).toMatch(/l[míi]mite/i);
  });
});