import { and, asc, desc, eq } from "drizzle-orm";

import type { Db } from "@/db/client";

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";

export { NotFoundError, ValidationError };
export { aiActions, aiChats, aiMessages, aiSettings } from "./schema";
import { aiActions, aiChats, aiMessages, aiSettings } from "./schema";

export type Chat = typeof aiChats.$inferSelect;
export type Message = typeof aiMessages.$inferSelect;
export type Setting = typeof aiSettings.$inferSelect;
export type Action = typeof aiActions.$inferSelect;

export type ActionStatus = Action["status"];
export type MessageRole = Message["role"];

const MESSAGE_ROLES = ["user", "assistant"] as const;
const ACTION_STATUSES = ["executed", "confirmed", "rejected", "failed", "pending"] as const;

const nowIso = () => new Date().toISOString();

/* --------------------------------- helpers --------------------------------- */

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`A ${field} is required.`);
  }
  return value.trim();
}

function optionalTitle(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, "title");
}

function jsonText(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`Invalid ${field}: must be a JSON string.`);
  }
  try {
    JSON.parse(value);
  } catch {
    throw new ValidationError(`Invalid ${field}: not valid JSON.`);
  }
  return value;
}

export function requireChat(db: Db, id: number): Chat {
  const found = db.select().from(aiChats).where(eq(aiChats.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown chat id: ${id}.`);
  return found;
}

/* ---------------------------------- chats ---------------------------------- */

export interface CreateChatInput {
  title?: string;
}

export function createChat(db: Db, input: CreateChatInput = {}): Chat {
  return db
    .insert(aiChats)
    .values({ title: optionalTitle(input.title), updatedAt: nowIso() })
    .returning()
    .get();
}

/** Newest activity first: chats are ordered by their updatedAt descending. */
export function listChats(db: Db): Chat[] {
  return db.select().from(aiChats).orderBy(desc(aiChats.updatedAt)).all();
}

export function getChat(db: Db, id: number): Chat {
  return requireChat(db, id);
}

/* -------------------------------- messages --------------------------------- */

export interface AddMessageInput {
  chatId: number;
  role: MessageRole;
  content: string;
}

export function addMessage(db: Db, input: AddMessageInput): Message {
  requireChat(db, input.chatId);
  if (!MESSAGE_ROLES.includes(input.role)) {
    throw new ValidationError(`Invalid role: ${String(input.role)}.`);
  }
  const message = db
    .insert(aiMessages)
    .values({
      chatId: input.chatId,
      role: input.role,
      content: requiredText(input.content, "content"),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
  // A new message is the chat's latest activity.
  db.update(aiChats).set({ updatedAt: nowIso() }).where(eq(aiChats.id, input.chatId)).run();
  return message;
}

/** Chat transcript, oldest first. */
export function listMessages(db: Db, chatId: number): Message[] {
  return db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.chatId, chatId))
    .orderBy(asc(aiMessages.id))
    .all();
}

/* -------------------------------- settings --------------------------------- */

export function setSetting(db: Db, key: string, value: string): Setting {
  const normalizedKey = requiredText(key, "key");
  const normalizedValue = requiredText(value, "value");
  return db
    .insert(aiSettings)
    .values({ key: normalizedKey, value: normalizedValue, updatedAt: nowIso() })
    .onConflictDoUpdate({
      target: aiSettings.key,
      set: { value: normalizedValue, updatedAt: nowIso() },
    })
    .returning()
    .get();
}

export function getSetting(db: Db, key: string): string | null {
  const row = db.select().from(aiSettings).where(eq(aiSettings.key, key)).get();
  return row?.value ?? null;
}

/* -------------------------------- action log ------------------------------- */

export interface LogActionInput {
  chatId: number;
  tool: string;
  args?: string;
  status?: ActionStatus;
  result?: string | null;
}

export function logAction(db: Db, input: LogActionInput): Action {
  requireChat(db, input.chatId);
  if (!ACTION_STATUSES.includes(input.status ?? "executed")) {
    throw new ValidationError(`Invalid status: ${String(input.status)}.`);
  }
  return db
    .insert(aiActions)
    .values({
      chatId: input.chatId,
      tool: requiredText(input.tool, "tool"),
      args: input.args === undefined ? "{}" : jsonText(input.args, "args"),
      status: input.status ?? "executed",
      result: input.result === undefined ? null : jsonText(input.result, "result"),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export function updateActionOutcome(
  db: Db,
  id: number,
  status: ActionStatus,
  result?: string | null,
): Action {
  const found = db.select().from(aiActions).where(eq(aiActions.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown action id: ${id}.`);
  if (!ACTION_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status: ${String(status)}.`);
  }
  const patch: Partial<typeof aiActions.$inferInsert> = {
    status,
    updatedAt: nowIso(),
  };
  if (result !== undefined) patch.result = result === null ? null : jsonText(result, "result");
  return db.update(aiActions).set(patch).where(eq(aiActions.id, id)).returning().get();
}

/** Audit trail for one chat, newest first. */
export function listActions(db: Db, chatId: number): Action[] {
  return db
    .select()
    .from(aiActions)
    .where(and(eq(aiActions.chatId, chatId)))
    .orderBy(desc(aiActions.id))
    .all();
}