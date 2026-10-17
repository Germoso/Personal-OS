import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

function newDb(): Db {
  const db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

let db: Db;

beforeEach(() => {
  db = newDb();
});

describe("createTask (S3)", () => {
  it("creates a task with the spec defaults", () => {
    const task = repo.createTask(db, { title: "Buy milk" });

    expect(task).toMatchObject({
      title: "Buy milk",
      notes: "",
      projectId: null,
      status: "pending",
      priority: "medium",
      dueDate: null,
    });
  });

  it("stores every field when all are provided", () => {
    const project = repo.createProject(db, { name: "Home" });
    const task = repo.createTask(db, {
      title: "Fix sink",
      notes: "Call plumber",
      projectId: project.id,
      status: "in_progress",
      priority: "high",
      dueDate: "2026-01-15",
    });

    expect(task).toMatchObject({
      title: "Fix sink",
      notes: "Call plumber",
      projectId: project.id,
      status: "in_progress",
      priority: "high",
      dueDate: "2026-01-15",
    });
  });

  it("rejects a blank or missing title and stores nothing", () => {
    for (const title of ["", "   "]) {
      expect(() => repo.createTask(db, { title })).toThrow(/title/i);
    }
    expect(repo.listTasks(db, {})).toEqual([]);
  });

  it("rejects invalid status, priority and due date formats", () => {
    expect(() =>
      repo.createTask(db, { title: "A", status: "blocked" as never }),
    ).toThrow(/status/i);
    expect(() =>
      repo.createTask(db, { title: "A", priority: "urgent" as never }),
    ).toThrow(/priority/i);
    expect(() =>
      repo.createTask(db, { title: "A", dueDate: "15-01-2026" }),
    ).toThrow(/due date/i);
    expect(repo.listTasks(db, {})).toEqual([]);
  });

  it("rejects a projectId that does not exist and stores nothing", () => {
    expect(() => repo.createTask(db, { title: "A", projectId: 999 })).toThrow(
      /project/i,
    );
    expect(repo.listTasks(db, {})).toEqual([]);
  });

  it("trims the title", () => {
    const task = repo.createTask(db, { title: "  Ship it  " });
    expect(task.title).toBe("Ship it");
  });
});

describe("updateTask (S3)", () => {
  it("updates title, notes, priority and due date", () => {
    const task = repo.createTask(db, { title: "Old" });
    const updated = repo.updateTask(db, {
      id: task.id,
      title: "New",
      notes: "Note",
      priority: "low",
      dueDate: "2026-02-01",
    });

    expect(updated).toMatchObject({
      id: task.id,
      title: "New",
      notes: "Note",
      priority: "low",
      dueDate: "2026-02-01",
      status: "pending",
    });
  });

  it("advances status through pending, in_progress and done", () => {
    const task = repo.createTask(db, { title: "A" });

    expect(repo.setTaskStatus(db, { id: task.id, status: "in_progress" }).status)
      .toBe("in_progress");
    expect(repo.setTaskStatus(db, { id: task.id, status: "done" }).status).toBe(
      "done",
    );
  });

  it("moves a task to a project and back to the Inbox", () => {
    const project = repo.createProject(db, { name: "Work" });
    const task = repo.createTask(db, { title: "A" });

    expect(repo.setTaskProject(db, { id: task.id, projectId: project.id }).projectId).toBe(
      project.id,
    );
    expect(repo.setTaskProject(db, { id: task.id, projectId: null }).projectId).toBeNull();
  });

  it("rejects an unknown task id and an unknown project id", () => {
    expect(() => repo.updateTask(db, { id: 404, title: "X" })).toThrow(/task/i);
    expect(() => repo.setTaskProject(db, { id: 404, projectId: 404 })).toThrow(
      /task/i,
    );

    const task = repo.createTask(db, { title: "A" });
    expect(() => repo.setTaskProject(db, { id: task.id, projectId: 77 })).toThrow(
      /project/i,
    );
    expect(db.select().from(repo.tasks).all()[0].projectId).toBeNull();
  });
});

describe("deleteTask (S3)", () => {
  it("removes the task", () => {
    const task = repo.createTask(db, { title: "A" });
    repo.deleteTask(db, task.id);
    expect(repo.listTasks(db, {})).toEqual([]);
  });
});

describe("queries (S4)", () => {
  it("listInbox returns only tasks without a project", () => {
    const project = repo.createProject(db, { name: "P" });
    const inInbox = repo.createTask(db, { title: "Inbox" });
    repo.createTask(db, { title: "In project", projectId: project.id });

    const ids = repo.listInbox(db).map((t) => t.id);
    expect(ids).toEqual([inInbox.id]);
  });

  it("listByProject returns only that project's tasks", () => {
    const a = repo.createProject(db, { name: "A" });
    const b = repo.createProject(db, { name: "B" });
    const inA = repo.createTask(db, { title: "a1", projectId: a.id });
    repo.createTask(db, { title: "b1", projectId: b.id });
    repo.createTask(db, { title: "inbox" });

    const ids = repo.listByProject(db, a.id).map((t) => t.id);
    expect(ids).toEqual([inA.id]);
  });

  it("listTasks filters by status and priority", () => {
    const done = repo.createTask(db, { title: "x", status: "done" });
    repo.createTask(db, { title: "y", priority: "high" });

    expect(repo.listTasks(db, { status: "done" }).map((t) => t.id)).toEqual([done.id]);
    expect(repo.listTasks(db, { priority: "high" })).toHaveLength(1);
  });
});
