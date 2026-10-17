import { connection } from "next/server";

import { db } from "@/db";
import { ProjectForm } from "@/modules/tasks/components/project-form";
import { ProjectList } from "@/modules/tasks/components/project-list";
import * as repo from "@/modules/tasks/db/repository";

// Local SQLite reads are sub-millisecond: render on demand, never prerender stale data.
export const instant = false;

export default async function ProjectsPage() {
  await connection();

  const projects = repo.listProjects(db);
  const tasks = repo.listTasks(db);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Proyectos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Agrupa tus tareas por área de trabajo o de vida.
        </p>
      </header>
      <ProjectForm />
      <ProjectList projects={projects} tasks={tasks} />
    </section>
  );
}
