/**
 * Minimal OpenAI-compatible chat completions client for the AI assistant.
 * Points at an OpenAI-compatible endpoint (Runware by default) and exposes
 * enough of the API to drive a tool-calling loop: assistant text and tool
 * calls. The API key is read server-side and never leaves the server.
 */

export class LLMError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LLMError";
    this.status = status;
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  /** Present on assistant messages that request tool calls. */
  toolCalls?: ToolCall[];
  /** Present on tool messages; links the result to a previous tool call. */
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Parsed JSON arguments. */
  arguments: Record<string, unknown>;
}

export interface LLMTool {
  name: string;
  description: string;
  /** JSON Schema describing the arguments. */
  parameters: Record<string, unknown>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface LLMClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  /** Injectable fetch for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_MAX_TOKENS = 8192;

/** Resolve the LLM configuration from the environment (server-side only). */
export function configFromEnv(): LLMClientConfig {
  const apiKey = process.env.RUNWARE_API_KEY ?? "";
  if (apiKey.trim() === "") {
    throw new LLMError("Missing RUNWARE_API_KEY. Add it to .env.local (gitignored).");
  }
  return {
    apiKey: apiKey.trim(),
    baseUrl: (process.env.RUNWARE_BASE_URL ?? "https://api.runware.ai/v1").replace(/\/+$/, ""),
    model: process.env.AI_MODEL ?? "deepseek:v4@flash",
    maxTokens: process.env.AI_MAX_TOKENS ? Number(process.env.AI_MAX_TOKENS) : DEFAULT_MAX_TOKENS,
  };
}

function toWireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      })),
    };
  }
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId ?? "", content: message.content ?? "" };
  }
  return { role: message.role, content: message.content ?? "" };
}

function parseToolCalls(
  raw: unknown,
): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  const calls: ToolCall[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== "object") continue;
    const fn = (item as { function?: unknown }).function;
    if (fn === null || typeof fn !== "object") continue;
    const name = (fn as { name?: unknown }).name;
    const rawArgs = (fn as { arguments?: unknown }).arguments;
    if (typeof name !== "string") continue;
    let arguments_: Record<string, unknown> = {};
    if (typeof rawArgs === "string") {
      try {
        const parsed = JSON.parse(rawArgs);
        if (parsed !== null && typeof parsed === "object") arguments_ = parsed as Record<string, unknown>;
      } catch {
        arguments_ = {};
      }
    }
    calls.push({
      id: typeof (item as { id?: unknown }).id === "string" ? (item as { id: string }).id : `call_${calls.length}`,
      name,
      arguments: arguments_,
    });
  }
  return calls;
}

export async function chatCompletion(
  config: LLMClientConfig,
  messages: ChatMessage[],
  tools?: LLMTool[],
): Promise<LLMResponse> {
  if (config.apiKey.trim() === "") {
    throw new LLMError("Missing API key.");
  }
  const fetchImpl = config.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: messages.map(toWireMessage),
    temperature: 0,
    max_tokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
  if (tools && tools.length > 0) {
    body.tools = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new LLMError(`LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const raw = await response.text();
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed?.error?.message) detail = parsed.error.message;
      else if (raw) detail = raw.slice(0, 200);
    } catch {
      // keep the status-only detail
    }
    throw new LLMError(`LLM request failed: ${detail}`, response.status);
  }

  let data: {
    choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown } }>;
  };
  try {
    data = (await response.json()) as typeof data;
  } catch (error) {
    throw new LLMError(`LLM returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const choice = data.choices?.[0];
  if (!choice?.message) {
    throw new LLMError("LLM returned an unexpected response shape.");
  }
  const content = choice.message.content;
  return {
    content: typeof content === "string" ? content : null,
    toolCalls: parseToolCalls(choice.message.tool_calls),
  };
}