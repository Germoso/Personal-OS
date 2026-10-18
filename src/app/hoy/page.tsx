import { connection } from "next/server";

import { db } from "@/db";
import { localTodayIso } from "@/lib/date";
import { TaskForm } from "@/modules/tasks/components/task-form";
import { TaskList } from "@/modules/tasks/components/task-list";
import * as repo from "@/modules/tasks/db/repository";

// Local SQLite reads are sub-millisecond: render on demand, never prerender stale data.
export const instant = false;

export default async function HoyPage() {
  await connection();

  const today = localTodayIso();
  const tasks = repo.listHoy(db, today);
  const overdue = tasks.filter((task) => task.dueDate !== null && task.dueDate < today);
  const projects = repo
    .listProjects(db, { status: "active" })
    .map((project) => ({ id: project.id, name: project.name }));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-normal">Hoy</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {today} · {overdue.length === 0
            ? "nada vencido"
            : overdue.length === 1
              ? "1 tarea vencida"
              : `${overdue.length} tareas vencidas`}
        </p>
      </header>
      <TaskForm projects={projects} />
      <TaskList tasks={tasks} />
    </section>
  );
}
