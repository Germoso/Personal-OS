import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/db", async () => {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { createDb } = await import("@/db/client");
  const db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db };
});

import { db } from "@/db";

import * as repo from "./db/repository";
import {
  archiveProjectFormAction,
  createProjectFormAction,
  createTaskFormAction,
  deleteProjectFormAction,
  deleteTaskFormAction,
  setTaskStatusFormAction,
} from "./form-actions";

function fd(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

beforeEach(() => {
  revalidatePath.mockClear();
  for (const task of repo.listTasks(db)) repo.deleteTask(db, task.id);
  for (const project of repo.listProjects(db)) repo.deleteProject(db, project.id);
});

describe("createTaskFormAction (S3, S5)", () => {
  it("creates the task from the form and revalidates the app", async () => {
    const state = await createTaskFormAction(
      { ok: false },
      fd({ title: "  Desde el form  ", priority: "high", dueDate: "2026-03-01" }),
    );

    expect(state).toEqual({ ok: true });
    expect(repo.listInbox(db)).toMatchObject([
      { title: "Desde el form", priority: "high", dueDate: "2026-03-01" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("treats an empty project select as Inbox", async () => {
    await createTaskFormAction({ ok: false }, fd({ title: "Sin proyecto", projectId: "" }));
    expect(repo.listInbox(db)).toHaveLength(1);
  });

  it("returns the validation message and stores nothing", async () => {
    const state = await createTaskFormAction({ ok: false }, fd({ title: "   " }));

    expect(state).toEqual({ ok: false, error: "A title is required." });
    expect(repo.listTasks(db)).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an unknown project id from a tampered form", async () => {
    const state = await createTaskFormAction(
      { ok: false },
      fd({ title: "A", projectId: "999" }),
    );

    expect(state.ok).toBe(false);
    expect(state.error).toMatch(/project/i);
    expect(repo.listTasks(db)).toEqual([]);
  });
});

describe("task command form actions (S3, S5)", () => {
  it("moves a task through statuses and deletes it", async () => {
    const task = repo.createTask(db, { title: "Comando" });

    await setTaskStatusFormAction(fd({ id: String(task.id), status: "done" }));
    expect(repo.listTasks(db, { status: "done" }).map((t) => t.id)).toEqual([task.id]);

    await deleteTaskFormAction(fd({ id: String(task.id) }));
    expect(repo.listTasks(db)).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("ignores an invalid status without touching the task", async () => {
    const task = repo.createTask(db, { title: "Intacta" });

    await setTaskStatusFormAction(fd({ id: String(task.id), status: "blocked" }));
    expect(repo.listTasks(db)[0].status).toBe("pending");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("project form actions (S2, S5)", () => {
  it("creates, archives and unarchives a project from forms", async () => {
    const created = await createProjectFormAction(
      { ok: false },
      fd({ name: "Trabajo", description: "Laburo", color: "#00ff00" }),
    );
    expect(created).toEqual({ ok: true });

    const project = repo.listProjects(db)[0];
    expect(project).toMatchObject({ name: "Trabajo", color: "#00ff00" });

    await archiveProjectFormAction(fd({ id: String(project.id), status: "archived" }));
    expect(repo.getProject(db, project.id).status).toBe("archived");

    await archiveProjectFormAction(fd({ id: String(project.id), status: "active" }));
    expect(repo.getProject(db, project.id).status).toBe("active");
  });

  it("rejects a blank project name and reports it", async () => {
    const state = await createProjectFormAction({ ok: false }, fd({ name: "" }));

    expect(state.ok).toBe(false);
    expect(state.error).toMatch(/name/i);
    expect(repo.listProjects(db)).toEqual([]);
  });

  it("deletes a project and revalidates", async () => {
    const project = repo.createProject(db, { name: "Efímero" });

    await deleteProjectFormAction(fd({ id: String(project.id) }));
    expect(repo.listProjects(db)).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
