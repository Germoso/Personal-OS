import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LLMError,
  chatCompletion,
  type ChatMessage,
  type LLMResponse,
} from "./client";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
});

const config = {
  apiKey: "test-key",
  baseUrl: "https://api.example.test/v1",
  model: "deepseek:v4@flash",
  maxTokens: 8192,
};

const messages: ChatMessage[] = [{ role: "user", content: "hola" }];

describe("chatCompletion request (S31)", () => {
  it("posts to /chat/completions with bearer auth and the right body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { role: "assistant", content: "Hola!" } }] }),
    );
    await chatCompletion({ ...config, fetchImpl: fetchMock as never }, messages);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("deepseek:v4@flash");
    expect(body.max_tokens).toBe(8192);
    expect(body.messages).toEqual([{ role: "user", content: "hola" }]);
  });

  it("includes tools when provided", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { role: "assistant", content: "" } }] }),
    );
    await chatCompletion(
      { ...config, fetchImpl: fetchMock as never },
      messages,
      [{ name: "tasks.createTask", description: "crea una tarea", parameters: { type: "object" } }],
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.tools).toEqual([
      {
        type: "function",
        function: {
          name: "tasks.createTask",
          description: "crea una tarea",
          parameters: { type: "object" },
        },
      },
    ]);
  });
});

describe("chatCompletion response parsing (S31)", () => {
  it("returns assistant text", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { role: "assistant", content: "Listo, hecho." } }] }),
    );
    const res: LLMResponse = await chatCompletion({ ...config, fetchImpl: fetchMock as never }, messages);
    expect(res.content).toBe("Listo, hecho.");
    expect(res.toolCalls).toEqual([]);
  });

  it("parses tool calls with JSON arguments", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "tasks.createTask", arguments: '{"title":"Comprar pan"}' },
                },
              ],
            },
          },
        ],
      }),
    );
    const res = await chatCompletion({ ...config, fetchImpl: fetchMock as never }, messages);
    expect(res.content).toBeNull();
    expect(res.toolCalls).toEqual([
      { id: "call_1", name: "tasks.createTask", arguments: { title: "Comprar pan" } },
    ]);
  });
});

describe("chatCompletion errors (S31)", () => {
  it("throws LLMError with status on non-2xx", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
    );
    await expect(chatCompletion({ ...config, fetchImpl: fetchMock as never }, messages)).rejects.toMatchObject({
      name: "LLMError",
      status: 401,
    });
  });

  it("throws LLMError on network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(chatCompletion({ ...config, fetchImpl: fetchMock as never }, messages)).rejects.toMatchObject({
      name: "LLMError",
    });
  });

  it("throws LLMError on malformed response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [] }));
    await expect(chatCompletion({ ...config, fetchImpl: fetchMock as never }, messages)).rejects.toBeInstanceOf(
      LLMError,
    );
  });

  it("throws LLMError when the API key is missing", async () => {
    await expect(
      chatCompletion({ ...config, apiKey: "", fetchImpl: fetchMock as never }, messages),
    ).rejects.toMatchObject({ name: "LLMError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});