"use client";

import { useActionState } from "react";

import { createTaskFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function TaskForm({
  projectId,
  projects,
}: {
  projectId?: number;
  projects?: { id: number; name: string }[];
}) {
  const [state, action] = useActionState(createTaskFormAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap gap-2">
        <input
          name="title"
          placeholder="Nueva tarea…"
          required
          className="min-w-48 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />
        <select
          name="priority"
          defaultValue="medium"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        >
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        <input
          type="date"
          name="dueDate"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
        {projects ? (
          <select
            name="projectId"
            defaultValue={projectId ?? ""}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
          >
            <option value="">Inbox</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="projectId" value={projectId ?? ""} />
        )}
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
          Añadir
        </button>
        {state.ok ? (
          <span className="text-sm text-emerald-400">Guardada</span>
        ) : state.error ? (
          <span className="text-sm text-red-400">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
