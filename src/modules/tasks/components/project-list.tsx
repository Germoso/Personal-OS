import Link from "next/link";

import type { Project, Task } from "../db/types";
import {
  archiveProjectFormAction,
  deleteProjectFormAction,
} from "../form-actions";

function Count({ count }: { count: number }) {
  return (
    <span className="text-xs text-neutral-500">
      {count === 1 ? "1 tarea" : `${count} tareas`}
    </span>
  );
}

export function ProjectList({
  projects,
  tasks,
}: {
  projects: Project[];
  tasks: Task[];
}) {
  const active = projects.filter((project) => project.status === "active");
  const archived = projects.filter((project) => project.status === "archived");

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Activos
        </h2>
        {active.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-6 text-center text-sm text-neutral-500">
            Todavía no tienes proyectos activos.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {active.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <Link
                    href={`/projects/${project.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className="ml-auto">
                    <Count
                      count={tasks.filter((task) => task.projectId === project.id).length}
                    />
                  </span>
                </div>
                {project.description ? (
                  <p className="text-xs text-neutral-500">{project.description}</p>
                ) : null}
                <div className="flex items-center gap-2">
                  <form action={archiveProjectFormAction} className="contents">
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="status" value="archived" />
                    <button
                      type="submit"
                      className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100"
                    >
                      Archivar
                    </button>
                  </form>
                  <form action={deleteProjectFormAction} className="contents">
                    <input type="hidden" name="id" value={project.id} />
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
        )}
      </section>

      {archived.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Archivados
          </h2>
          <ul className="flex flex-col gap-2">
            {archived.map((project) => (
              <li
                key={project.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full opacity-50"
                  style={{ backgroundColor: project.color }}
                />
                <Link
                  href={`/projects/${project.id}`}
                  className="truncate text-sm text-neutral-400 hover:underline"
                >
                  {project.name}
                </Link>
                <span className="ml-auto flex items-center gap-2">
                  <Count
                    count={tasks.filter((task) => task.projectId === project.id).length}
                  />
                  <form action={archiveProjectFormAction} className="contents">
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="status" value="active" />
                    <button
                      type="submit"
                      className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100"
                    >
                      Reactivar
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
