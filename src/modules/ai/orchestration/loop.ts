import type { Db } from "@/db/client";

import { logAction, updateActionOutcome, type ActionStatus } from "@/modules/ai/db/repository";
import {
  chatCompletion,
  configFromEnv,
  type ChatMessage,
  type LLMResponse,
  type LLMTool,
} from "@/modules/ai/llm/client";
import { buildSystemPrompt } from "@/modules/ai/prompt";
import { executeTool, getTool, listToolDefs, type ToolDef, type ToolResult } from "@/modules/ai/tools/registry";

/**
 * Orchestration loop: turns a user message into an assistant answer by giving
 * the LLM the real tool catalog, executing requested tools through the
 * autonomy gate (S33/S36), and feeding results back until the model answers.
 * The LLM call and the tool executor are injectable so the loop is fully
 * deterministic-tested with a stub; the real wiring is exercised at runtime.
 */

export type AutonomyLevel = "ask-on-delete" | "ask-on-mutation" | "autonomous";

export const AUTONOMY_LEVELS: AutonomyLevel[] = ["ask-on-delete", "ask-on-mutation", "autonomous"];

export interface PendingConfirmation {
  tool: string;
  args: Record<string, unknown>;
}

export interface PreAuthorizedTool {
  name: string;
  args: Record<string, unknown>;
}

export interface ExecutedTool {
  name: string;
  ok: boolean;
  error?: string;
}

export interface TurnInput {
  chatId: number;
  /** Conversation thread; the latest user message is already appended. */
  messages: ChatMessage[];
  autonomy: AutonomyLevel;
  /** Tools the human approved from a previous pending confirmation. */
  preAuthorized?: PreAuthorizedTool[];
  maxIterations?: number;
  /** Injectable LLM caller: (messages, tools) => response. Defaults to chatCompletion. */
  llm?: (messages: ChatMessage[], tools?: LLMTool[]) => Promise<LLMResponse>;
  /** Injectable tool executor. Defaults to the real registry executor. */
  execute?: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface TurnResult {
  content: string | null;
  requiresConfirmation: PendingConfirmation | null;
  executed: ExecutedTool[];
}

const DEFAULT_MAX_ITERATIONS = 4;

function needsConfirmation(def: ToolDef, autonomy: AutonomyLevel): boolean {
  if (autonomy === "autonomous") return false;
  if (autonomy === "ask-on-mutation") return def.mutates ?? true;
  return def.destructive;
}

function toolDefinitions(): LLMTool[] {
  return listToolDefs().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

function defaultLLM(messages: ChatMessage[], tools?: LLMTool[]): Promise<LLMResponse> {
  return chatCompletion(configFromEnv(), messages, tools);
}

function logResult(
  db: Db,
  chatId: number,
  tool: string,
  args: Record<string, unknown>,
  status: ActionStatus,
  result?: string,
): void {
  if (status === "pending") {
    logAction(db, { chatId, tool, args: JSON.stringify(args), status: "pending" });
    return;
  }
  const action = logAction(db, { chatId, tool, args: JSON.stringify(args), status });
  updateActionOutcome(db, action.id, status, result ?? null);
}

function toToolMessageContent(result: ToolResult): string {
  return result.ok ? JSON.stringify(result.data) : `Error: ${result.error ?? "uncooked failure"}`;
}

export async function runTurn(db: Db, input: TurnInput): Promise<TurnResult> {
  const autonomy = input.autonomy;
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const llm = input.llm ?? defaultLLM;
  const execute = input.execute ?? executeTool;
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(new Date().toISOString().slice(0, 10)) },
    ...input.messages,
  ];
  const executed: ExecutedTool[] = [];

  /* Pre-authorized tools (the human confirmed a pending action): run them,
     then let the model answer with the tool results and no new tool calls. */
  if (input.preAuthorized && input.preAuthorized.length > 0) {
    for (const [index, authorized] of input.preAuthorized.entries()) {
      const callId = `pre_${index}`;
      const result = await execute(authorized.name, authorized.args);
      executed.push({ name: authorized.name, ok: result.ok, error: result.ok ? undefined : result.error });
      logResult(db, input.chatId, authorized.name, authorized.args, result.ok ? "executed" : "failed", result.ok ? undefined : JSON.stringify({ error: result.error }));
      messages.push({
        role: "assistant",
        content: null,
        toolCalls: [{ id: callId, name: authorized.name, arguments: authorized.args }],
      });
      messages.push({
        role: "tool",
        toolCallId: callId,
        content: toToolMessageContent(result),
      });
    }
    const final = await llm(messages);
    return { content: final.content, requiresConfirmation: null, executed };
  }

  /* Ordinary turn: LLM with tools, gate every requested call, feed results. */
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await llm(messages, toolDefinitions());
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return { content: response.content, requiresConfirmation: null, executed };
    }

    for (const call of response.toolCalls) {
      const def = getTool(call.name);
      if (!def) {
        // Unknown tool: tell the model and let it retry with a valid one.
        messages.push({
          role: "assistant",
          content: null,
          toolCalls: [call],
        });
        messages.push({
          role: "tool",
          toolCallId: call.id,
          content: `Error: Unknown tool: ${call.name}. Choose one from the provided tool list.`,
        });
        executed.push({ name: call.name, ok: false, error: "Unknown tool" });
        continue;
      }

      if (needsConfirmation(def, autonomy)) {
        logResult(db, input.chatId, call.name, call.arguments, "pending");
        return {
          content: null,
          requiresConfirmation: { tool: call.name, args: call.arguments },
          executed,
        };
      }

      const result = await execute(call.name, call.arguments);
      executed.push({ name: call.name, ok: result.ok, error: result.ok ? undefined : result.error });
      logResult(db, input.chatId, call.name, call.arguments, result.ok ? "executed" : "failed", result.ok ? undefined : JSON.stringify({ error: result.error }));
      messages.push({
        role: "assistant",
        content: null,
        toolCalls: [call],
      });
      messages.push({
        role: "tool",
        toolCallId: call.id,
        content: toToolMessageContent(result),
      });
    }
  }

  return {
    content:
      "Llegué al límite de pasos permitidos en esta petición. Probá reformularla o partirla en pedidos más chicos.",
    requiresConfirmation: null,
    executed,
  };
}