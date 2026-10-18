import { connection } from "next/server";

import { db } from "@/db";
import { TaskForm } from "@/modules/tasks/components/task-form";
import { TaskList } from "@/modules/tasks/components/task-list";
import * as repo from "@/modules/tasks/db/repository";

// Local SQLite reads are sub-millisecond: render on demand, never prerender stale data.
export const instant = false;

export default async function InboxPage() {
  await connection();

  const tasks = repo.listInbox(db);
  const projects = repo
    .listProjects(db, { status: "active" })
    .map((project) => ({ id: project.id, name: project.name }));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-normal">Inbox</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tareas sin proyecto asignado.
        </p>
      </header>
      <TaskForm projects={projects} />
      <TaskList tasks={tasks} />
    </section>
  );
}
