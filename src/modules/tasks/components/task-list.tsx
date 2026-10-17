import { localTodayIso } from "@/lib/date";

import {
  deleteTaskFormAction,
  setTaskStatusFormAction,
} from "../form-actions";
import type { Task, TaskPriority, TaskStatus } from "../db/types";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecha",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-neutral-500",
};

function StatusButton({
  task,
  status,
}: {
  task: Task;
  status: TaskStatus;
}) {
  const isActive = task.status === status;
  return (
    <form action={setTaskStatusFormAction} className="contents">
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        aria-pressed={isActive}
        className={
          isActive
            ? "rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-900"
            : "rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100"
        }
      >
        {STATUS_LABEL[status]}
      </button>
    </form>
  );
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
        No hay tareas aquí.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p
              className={
                task.status === "done"
                  ? "truncate text-sm text-neutral-500 line-through"
                  : "truncate text-sm font-medium"
              }
            >
              {task.title}
            </p>
            {task.notes ? (
              <p className="mt-1 text-xs text-neutral-500">{task.notes}</p>
            ) : null}
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className={PRIORITY_CLASS[task.priority]}>
                {PRIORITY_LABEL[task.priority]}
              </span>
              {task.dueDate ? (
                <span
                  className={
                    task.status !== "done" &&
                    task.dueDate < localTodayIso()
                      ? "text-red-400"
                      : ""
                  }
                >
                  {task.dueDate}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusButton task={task} status="pending" />
            <StatusButton task={task} status="in_progress" />
            <StatusButton task={task} status="done" />
            <form action={deleteTaskFormAction} className="contents">
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
              >
                Borrar
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
