"use server";

import { db as appDb } from "@/db";
import type { Db } from "@/db/client";

import { toActionResult, type ActionResult } from "@/modules/tasks/action-result";
import type { ChatMessage, LLMResponse, LLMTool } from "@/modules/ai/llm/client";
import {
  addMessage,
  createChat,
  getSetting,
  listActions,
  listMessages,
  setSetting,
  updateActionOutcome,
  ValidationError,
  NotFoundError,
} from "@/modules/ai/db/repository";
import { AUTONOMY_LEVELS, runTurn, type AutonomyLevel, type PendingConfirmation } from "@/modules/ai/orchestration/loop";
import { type ToolResult } from "@/modules/ai/tools/registry";

/**
 * Server actions for the AI chat panel. The pipeline (LLM call + tool
 * executor) is injectable through `deps` so tests run fully isolated with an
 * in-memory DB and a stub LLM; the browser never passes `deps`.
 */

async function runAsync<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export interface ChatDeps {
  db?: Db;
  llm?: (messages: ChatMessage[], tools?: LLMTool[]) => Promise<LLMResponse>;
  execute?: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}

const CONFIRM_PREFIX = "⏳ Confirmar acción:";

export interface SendMessageInput {
  chatId?: number | null;
  content: string;
}

export interface SendMessageResult {
  chatId: number;
  assistantContent: string | null;
  pending: PendingConfirmation | null;
}

export async function sendMessage(
  input: SendMessageInput,
  deps: ChatDeps = {},
): Promise<ActionResult<SendMessageResult>> {
  return runAsync(async () => {
    const db = deps.db ?? appDb;
    const chatId = input.chatId ?? createChat(db, {}).id;
    addMessage(db, { chatId, role: "user", content: input.content });
    const history = listMessages(db, chatId).map<ChatMessage>((m) => ({
      role: m.role,
      content: m.content,
    }));
    const turn = await runTurn(db, {
      chatId,
      messages: history,
      autonomy: (getSetting(db, "autonomy") as AutonomyLevel | null) ?? "ask-on-delete",
      llm: deps.llm,
      execute: deps.execute,
    });

    if (turn.requiresConfirmation) {
      addMessage(db, {
        chatId,
        role: "assistant",
        content: `${CONFIRM_PREFIX} ${turn.requiresConfirmation.tool} ${JSON.stringify(turn.requiresConfirmation.args)}`,
      });
      return { chatId, assistantContent: null, pending: turn.requiresConfirmation };
    }
    const finalContent = turn.content ?? "";
    addMessage(db, { chatId, role: "assistant", content: finalContent });
    return { chatId, assistantContent: finalContent, pending: null };
  });
}

export interface ConfirmActionInput {
  chatId: number;
  tool: string;
  args: Record<string, unknown>;
}

export async function confirmAction(
  input: ConfirmActionInput,
  deps: ChatDeps = {},
): Promise<ActionResult<{ assistantContent: string }>> {
  return runAsync(async () => {
    const db = deps.db ?? appDb;
    addMessage(db, { chatId: input.chatId, role: "user", content: "Confirmo la acción." });
    const history = listMessages(db, input.chatId).map<ChatMessage>((m) => ({
      role: m.role,
      content: m.content,
    }));
    const turn = await runTurn(db, {
      chatId: input.chatId,
      messages: history,
      autonomy: (getSetting(db, "autonomy") as AutonomyLevel | null) ?? "ask-on-delete",
      preAuthorized: [{ name: input.tool, args: input.args }],
      llm: deps.llm,
      execute: deps.execute,
    });
    const content = turn.content ?? "";
    addMessage(db, { chatId: input.chatId, role: "assistant", content });
    return { assistantContent: content };
  });
}

export async function rejectAction(
  chatId: number,
  deps: ChatDeps = {},
): Promise<ActionResult<{ assistantContent: string }>> {
  return toActionResult(() => {
    const db = deps.db ?? appDb;
    // Mark the most recent pending action as rejected in the audit log.
    const [latest] = listActions(db, chatId);
    if (latest && latest.status === "pending") {
      updateActionOutcome(db, latest.id, "rejected", JSON.stringify({ reason: "human rejected" }));
    }
    const content = "Ok, no hago nada.";
    addMessage(db, { chatId, role: "assistant", content });
    return { assistantContent: content };
  });
}

export async function setAutonomy(
  level: AutonomyLevel,
  deps: { db?: Db } = {},
): Promise<ActionResult<{ level: AutonomyLevel }>> {
  return toActionResult(() => {
    if (!AUTONOMY_LEVELS.includes(level)) {
      throw new ValidationError(`Invalid autonomy level: ${String(level)}.`);
    }
    setSetting(deps.db ?? appDb, "autonomy", level);
    return { level };
  });
}

export async function getAutonomy(deps: { db?: Db } = {}): Promise<ActionResult<{ level: AutonomyLevel }>> {
  return toActionResult(() => {
    const stored = getSetting(deps.db ?? appDb, "autonomy");
    const level = AUTONOMY_LEVELS.includes(stored as AutonomyLevel) ? (stored as AutonomyLevel) : "ask-on-delete";
    return { level };
  });
}

/**
 * Reads the stored transcript of one chat (reads never mutate). A null or
 * unknown chat returns an empty list so the panel can render a fresh view.
 */
export async function loadChat(
  chatId: number | null,
): Promise<ActionResult<{ messages: { role: string; content: string }[] }>> {
  return toActionResult(() => {
    if (chatId === null) return { messages: [] };
    try {
      return { messages: listMessages(appDb, chatId).map((m) => ({ role: m.role, content: m.content })) };
    } catch {
      // Unknown chat: render empty instead of erroring the panel.
      return { messages: [] };
    }
  });
}