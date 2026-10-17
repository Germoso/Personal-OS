import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/db";
import { TaskForm } from "@/modules/tasks/components/task-form";
import { TaskList } from "@/modules/tasks/components/task-list";
import * as repo from "@/modules/tasks/db/repository";

// Local SQLite reads are sub-millisecond: render on demand, never prerender stale data.
export const instant = false;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) notFound();

  let project;
  try {
    project = repo.getProject(db, projectId);
  } catch {
    notFound();
  }

  const tasks = repo.listByProject(db, projectId);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/projects" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← Proyectos
        </Link>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-xl font-semibold">{project.name}</h1>
          {project.status === "archived" ? (
            <span className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
              Archivado
            </span>
          ) : null}
        </div>
        {project.description ? (
          <p className="text-sm text-neutral-500">{project.description}</p>
        ) : null}
      </header>
      <TaskForm projectId={project.id} />
      <TaskList tasks={tasks} />
    </section>
  );
}
