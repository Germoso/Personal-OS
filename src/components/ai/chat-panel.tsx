"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  confirmAction,
  getAutonomy,
  loadChat,
  rejectAction,
  sendMessage,
  setAutonomy,
} from "@/modules/ai/form-actions";

const CONFIRM_PREFIX = "⏳ Confirmar acción:";

type StoredMessage = { role: string; content: string };
type PendingAction = { tool: string; args: Record<string, unknown> };
type Autonomy = "ask-on-delete" | "ask-on-mutation" | "autonomous";

const AUTONOMY_OPTIONS: { value: Autonomy; label: string }[] = [
  { value: "ask-on-delete", label: "Confirmar borrados" },
  { value: "ask-on-mutation", label: "Confirmar cambios" },
  { value: "autonomous", label: "Autónomo" },
];

/** Parses "⏳ Confirmar acción: <tool> <json>" stored by the server. */
function parsePending(content: string): PendingAction | null {
  if (!content.startsWith(CONFIRM_PREFIX)) return null;
  const rest = content.slice(CONFIRM_PREFIX.length).trim();
  const space = rest.indexOf(" ");
  if (space === -1) return null;
  const tool = rest.slice(0, space);
  try {
    return { tool, args: JSON.parse(rest.slice(space + 1)) as Record<string, unknown> };
  } catch {
    return null;
  }
}

/** Last assistant message that encodes a pending confirmation, if any. */
function lastPending(messages: StoredMessage[]): PendingAction | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role !== "assistant") continue;
    const parsed = parsePending(messages[i].content);
    if (parsed) return parsed;
  }
  return null;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autonomy, setAutonomyLevel] = useState<Autonomy>("ask-on-delete");
  const pending = lastPending(messages);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadChat(null).then((res) => {
      if (res.ok) setMessages(res.data.messages);
    });
    void getAutonomy().then((res) => {
      if (res.ok) setAutonomyLevel(res.data.level);
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  function refresh(chat: number | null) {
    return loadChat(chat).then((res) => {
      if (res.ok) setMessages(res.data.messages);
    });
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    const previousChatId = chatId;
    setMessages((prev) => [...prev, { role: "user", content }]); // optimistic
    setInput("");
    const res = await sendMessage({ chatId, content });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (previousChatId === null || res.data.chatId !== previousChatId) setChatId(res.data.chatId);
    await refresh(res.data.chatId);
  }

  async function handleConfirm() {
    if (!pending || chatId === null) return;
    setBusy(true);
    setError(null);
    await confirmAction({ chatId, tool: pending.tool, args: pending.args });
    setBusy(false);
    await refresh(chatId);
  }

  async function handleReject() {
    if (chatId === null) return;
    setBusy(true);
    setError(null);
    await rejectAction(chatId);
    setBusy(false);
    await refresh(chatId);
  }

  async function handleNewChat() {
    setChatId(null);
    setMessages([]);
    await refresh(null);
  }

  function formatPendingLabel(p: PendingAction): string {
    const args = Object.entries(p.args)
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(", ");
    return args ? `${p.tool} (${args})` : p.tool;
  }

  async function handleAutonomyChange(next: Autonomy) {
    setAutonomyLevel(next);
    const res = await setAutonomy(next);
    if (res.ok) setAutonomyLevel(res.data.level);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir el asistente"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500"
      >
        {open ? "✕" : "✦"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[70vh] max-h-[600px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-wide">Asistente</h2>
            <div className="flex items-center gap-2">
              <select
                aria-label="Nivel de autonomía"
                value={autonomy}
                onChange={(e) => void handleAutonomyChange(e.target.value as Autonomy)}
                className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {AUTONOMY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleNewChat()}
                className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100"
              >
                + nueva
              </button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !busy && (
              <p className="pt-6 text-center text-sm text-neutral-500">
                Pedime lo que quieras: tareas, eventos, finanzas o cocina.
              </p>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3 py-2 text-sm text-white"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-800 px-3 py-2 text-sm text-neutral-100 ${parsePending(m.content) ? "italic" : ""}`}
                >
                  {m.content}
                </div>
              ),
            )}
            {busy && <div className="text-sm text-neutral-500">Pensando…</div>}
            {error && <div className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">{error}</div>}
          </div>

          {pending && !busy && (
            <div className="border-t border-neutral-800 px-4 py-3">
              <p className="mb-2 text-xs text-neutral-400">
                ¿Confirmás la acción? <span className="text-neutral-200">{formatPendingLabel(pending)}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  className="flex-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  className="flex-1 rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => void handleSend(e)} className="flex items-end gap-2 border-t border-neutral-800 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Escribí tu pedido…"
              className="max-h-32 flex-1 resize-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}