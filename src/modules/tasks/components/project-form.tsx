"use client";

import { useActionState } from "react";

import { createProjectFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function ProjectForm() {
  const [state, action] = useActionState(createProjectFormAction, INITIAL);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
    >
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Nombre del proyecto"
          required
          className="min-w-48 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />
        <input
          type="color"
          name="color"
          defaultValue="#6366f1"
          aria-label="Color del proyecto"
          className="h-10 w-12 rounded border border-neutral-700 bg-neutral-950 px-1 py-1"
        />
      </div>
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Crear proyecto
        </button>
        {state.ok ? (
          <span className="text-sm text-emerald-400">Creado</span>
        ) : state.error ? (
          <span className="text-sm text-red-400">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
