"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import {
  createEventFormAction,
  deleteEventFormActionState,
  updateEventFormAction,
  type FormState as EventFormState,
} from "../form-actions";
import {
  createTaskFormAction,
  deleteTaskFormActionState,
  updateTaskFormAction,
  type FormState as TaskFormState,
} from "@/modules/tasks/form-actions";
import type { CalendarItem, CalendarItemKind } from "../types";

export interface DialogPrefs {
  mode: "create" | "edit";
  /** null in create mode until the user picks event vs task. */
  kind: CalendarItemKind | null;
  date: string;
  startTime: string;
  endTime: string;
  item: CalendarItem | null;
}

const INITIAL = { ok: false } as const;

const inputClass =
  "rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm";

/**
 * Modal for creating/editing/deleting a calendar item (event or task) from the
 * grid. Uses the same server actions + useActionState pattern as the former
 * top-level EventForm. On success (or delete) the parent closes the dialog and
 * the page re-fetches the week thanks to revalidatePath.
 */
export function ItemDialog({
  prefs,
  onClose,
}: {
  prefs: DialogPrefs;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<CalendarItemKind | null>(prefs.kind);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-100">
            {prefs.mode === "edit" ? "Editar" : "Nuevo"} · {prefs.date}
            {kind ? ` · ${kind === "event" ? "Evento" : "Tarea"}` : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100"
          >
            Cerrar
          </button>
        </div>

        {kind === null ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-500">¿Qué quieres añadir?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKind("event")}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-700"
              >
                Evento
              </button>
              <button
                type="button"
                onClick={() => setKind("task")}
                className="flex-1 rounded-lg border border-dashed border-neutral-600 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-700"
              >
                Tarea
              </button>
            </div>
          </div>
        ) : kind === "event" ? (
          <EventEditor prefs={prefs} onDone={onClose} />
        ) : (
          <TaskEditor prefs={prefs} onDone={onClose} />
        )}
      </div>
    </div>
  );
}

function EditorLayout({
  children,
  error,
  deleteNode,
}: {
  children: ReactNode;
  error?: string;
  deleteNode?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {children}
      {deleteNode}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function EventEditor({
  prefs,
  onDone,
}: {
  prefs: DialogPrefs;
  onDone: () => void;
}) {
  const [state, action] = useActionState<EventFormState, FormData>(
    prefs.item ? updateEventFormAction : createEventFormAction,
    INITIAL,
  );
  const [deleteState, deleteAction] = useActionState<EventFormState, FormData>(
    deleteEventFormActionState,
    INITIAL,
  );

  useEffect(() => {
    if (state.ok || deleteState.ok) onDone();
  }, [state.ok, deleteState.ok, onDone]);

  const item = prefs.item;

  return (
    <EditorLayout
      error={state.error ?? deleteState.error}
      deleteNode={
        item ? (
          <form action={deleteAction} className="contents">
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="self-start rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
            >
              Borrar evento
            </button>
          </form>
        ) : undefined
      }
    >
      <form action={action} className="flex flex-col gap-3">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input
          name="title"
          required
          placeholder="Título"
          defaultValue={item?.title ?? ""}
          className={inputClass}
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            name="date"
            required
            defaultValue={item?.date ?? prefs.date}
            className={inputClass}
          />
          <input
            type="time"
            name="startTime"
            defaultValue={item?.startTime ?? prefs.startTime}
            className={inputClass}
          />
          <input
            type="time"
            name="endTime"
            defaultValue={item?.endTime ?? prefs.endTime}
            className={inputClass}
          />
        </div>
        <p className="text-[10px] text-neutral-500">
          Sin horas = todo el día. Fin ≤ inicio = termina al día siguiente.
        </p>
        <textarea
          name="notes"
          rows={2}
          placeholder="Notas (opcional)"
          defaultValue={item?.notes ?? ""}
          className={inputClass}
        />
        <button
          type="submit"
          className="self-start rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          {item ? "Guardar cambios" : "Añadir evento"}
        </button>
      </form>
    </EditorLayout>
  );
}

function TaskEditor({
  prefs,
  onDone,
}: {
  prefs: DialogPrefs;
  onDone: () => void;
}) {
  const [state, action] = useActionState<TaskFormState, FormData>(
    prefs.item ? updateTaskFormAction : createTaskFormAction,
    INITIAL,
  );
  const [deleteState, deleteAction] = useActionState<TaskFormState, FormData>(
    deleteTaskFormActionState,
    INITIAL,
  );

  useEffect(() => {
    if (state.ok || deleteState.ok) onDone();
  }, [state.ok, deleteState.ok, onDone]);

  const item = prefs.item;

  return (
    <EditorLayout
      error={state.error ?? deleteState.error}
      deleteNode={
        item ? (
          <form action={deleteAction} className="contents">
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="self-start rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
            >
              Borrar tarea
            </button>
          </form>
        ) : undefined
      }
    >
      <form action={action} className="flex flex-col gap-3">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input
          name="title"
          required
          placeholder="Título de la tarea"
          defaultValue={item?.title ?? ""}
          className={inputClass}
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            name="scheduleDate"
            defaultValue={item?.date ?? prefs.date}
            className={inputClass}
          />
          <input
            type="time"
            name="startTime"
            defaultValue={item?.startTime ?? prefs.startTime}
            className={inputClass}
          />
          <input
            type="time"
            name="endTime"
            defaultValue={item?.endTime ?? prefs.endTime}
            className={inputClass}
          />
        </div>
        <p className="text-[10px] text-neutral-500">
          Sin horas = tarea todo el día (banda superior). Sin fecha = no se
          muestra en el calendario.
        </p>
        <textarea
          name="notes"
          rows={2}
          placeholder="Notas (opcional)"
          defaultValue={item?.notes ?? ""}
          className={inputClass}
        />
        <button
          type="submit"
          className="self-start rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          {item ? "Guardar cambios" : "Agendar tarea"}
        </button>
      </form>
    </EditorLayout>
  );
}