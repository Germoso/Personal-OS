import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("createProject (S2)", () => {
  it("applies defaults: active status, default color, empty description", () => {
    const project = repo.createProject(db, { name: "Personal" });

    expect(project).toMatchObject({
      name: "Personal",
      description: "",
      status: "active",
    });
    expect(project.color).toMatch(/^#/);
  });

  it("stores provided fields and normalizes the color", () => {
    const project = repo.createProject(db, {
      name: "  Work  ",
      description: "Work stuff",
      color: "#FF0000",
    });

    expect(project).toMatchObject({
      name: "Work",
      description: "Work stuff",
      color: "#ff0000",
    });
  });

  it("rejects a blank name and stores nothing", () => {
    expect(() => repo.createProject(db, { name: "  " })).toThrow(/name/i);
    expect(repo.listProjects(db)).toEqual([]);
  });

  it("rejects a malformed color and an invalid status", () => {
    expect(() => repo.createProject(db, { name: "A", color: "red" })).toThrow(
      /color/i,
    );
    expect(() =>
      repo.createProject(db, { name: "A", status: "paused" as never }),
    ).toThrow(/status/i);
    expect(repo.listProjects(db)).toEqual([]);
  });
});

describe("updateProject (S2)", () => {
  it("updates name, description and color", () => {
    const project = repo.createProject(db, { name: "Old" });
    const updated = repo.updateProject(db, {
      id: project.id,
      name: "New",
      description: "Fresh",
      color: "#00ff00",
    });

    expect(updated).toMatchObject({
      id: project.id,
      name: "New",
      description: "Fresh",
      color: "#00ff00",
      status: "active",
    });
  });

  it("rejects an unknown project id", () => {
    expect(() => repo.updateProject(db, { id: 404, name: "X" })).toThrow(
      /project/i,
    );
  });

  it("rejects a blank name and keeps the previous value", () => {
    const project = repo.createProject(db, { name: "Keep me" });
    expect(() => repo.updateProject(db, { id: project.id, name: "  " })).toThrow(
      /name/i,
    );
    expect(repo.getProject(db, project.id).name).toBe("Keep me");
  });
});

describe("archiveProject (S2)", () => {
  it("archives and unarchives a project", () => {
    const project = repo.createProject(db, { name: "Seasonal" });

    expect(repo.archiveProject(db, project.id).status).toBe("archived");
    expect(repo.unarchiveProject(db, project.id).status).toBe("active");
  });

  it("rejects an unknown project id", () => {
    expect(() => repo.archiveProject(db, 404)).toThrow(/project/i);
  });
});

describe("listProjects and getProject (S2)", () => {
  it("returns all projects by default and filters by status", () => {
    const active = repo.createProject(db, { name: "Active one" });
    const archived = repo.createProject(db, { name: "Archived one" });
    repo.archiveProject(db, archived.id);

    expect(repo.listProjects(db).map((p) => p.id)).toEqual([active.id, archived.id]);
    expect(repo.listProjects(db, { status: "active" }).map((p) => p.id)).toEqual([
      active.id,
    ]);
    expect(repo.listProjects(db, { status: "archived" }).map((p) => p.id)).toEqual([
      archived.id,
    ]);
  });

  it("rejects an unknown project id on getProject", () => {
    expect(() => repo.getProject(db, 404)).toThrow(/project/i);
  });
});

describe("deleteProject (S2, S3)", () => {
  it("removes the project and leaves its tasks in the Inbox", () => {
    const project = repo.createProject(db, { name: "Doomed" });
    const task = repo.createTask(db, { title: "Survivor", projectId: project.id });

    repo.deleteProject(db, project.id);

    expect(repo.listProjects(db)).toEqual([]);
    expect(repo.listInbox(db).map((t) => t.id)).toEqual([task.id]);
  });

  it("rejects an unknown project id", () => {
    expect(() => repo.deleteProject(db, 404)).toThrow(/project/i);
  });
});
