"use client";

import { useActionState } from "react";

import { createEventFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function EventForm({ defaultDate }: { defaultDate?: string }) {
  const [state, action] = useActionState(createEventFormAction, INITIAL);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
    >
      <div className="flex flex-wrap gap-2">
        <input
          name="title"
          placeholder="Nuevo evento…"
          required
          className="min-w-48 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="date"
          defaultValue={defaultDate}
          required
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="time"
          name="startTime"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
        <input
          type="time"
          name="endTime"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
      </div>
      <textarea
        name="notes"
        placeholder="Notas (opcional)"
        rows={2}
        className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Añadir evento
        </button>
        {state.ok ? (
          <span className="text-sm text-emerald-400">Guardado</span>
        ) : state.error ? (
          <span className="text-sm text-red-400">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
