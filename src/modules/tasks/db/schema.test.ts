import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import { projects, tasks } from "./schema";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("projects table (S2)", () => {
  it("applies defaults: status active, default color, empty description", () => {
    db.insert(projects).values({ name: "Personal" }).run();

    const row = db.select().from(projects).all()[0];
    expect(row.name).toBe("Personal");
    expect(row.status).toBe("active");
    expect(row.color).toMatch(/^#/);
    expect(row.description).toBe("");
  });

  it("stores name, description, color and archived status", () => {
    db.insert(projects)
      .values({
        name: "Work",
        description: "Work stuff",
        color: "#ff0000",
        status: "archived",
      })
      .run();

    const row = db.select().from(projects).all()[0];
    expect(row).toMatchObject({
      name: "Work",
      description: "Work stuff",
      color: "#ff0000",
      status: "archived",
    });
  });
});

describe("tasks table (S3)", () => {
  it("applies defaults: status pending, priority medium, no project (Inbox)", () => {
    db.insert(tasks).values({ title: "Buy milk" }).run();

    const row = db.select().from(tasks).all()[0];
    expect(row.status).toBe("pending");
    expect(row.priority).toBe("medium");
    expect(row.projectId).toBeNull();
    expect(row.notes).toBe("");
    expect(row.dueDate).toBeNull();
    expect(row.scheduleDate).toBeNull();
    expect(row.startTime).toBeNull();
    expect(row.endTime).toBeNull();
  });

  it("stores all fields including optional project, due date and scheduling", () => {
    const project = db
      .insert(projects)
      .values({ name: "Home" })
      .returning()
      .get();

    db.insert(tasks)
      .values({
        title: "Fix sink",
        notes: "Call plumber if needed",
        projectId: project.id,
        status: "in_progress",
        priority: "high",
        dueDate: "2026-01-15",
        scheduleDate: "2026-01-17",
        startTime: "09:30",
        endTime: "11:00",
      })
      .run();

    const row = db.select().from(tasks).all()[0];
    expect(row).toMatchObject({
      title: "Fix sink",
      notes: "Call plumber if needed",
      projectId: project.id,
      status: "in_progress",
      priority: "high",
      dueDate: "2026-01-15",
      scheduleDate: "2026-01-17",
      startTime: "09:30",
      endTime: "11:00",
    });
  });

  it("keeps the task in Inbox (projectId null) when its project is deleted", () => {
    const project = db
      .insert(projects)
      .values({ name: "Temp" })
      .returning()
      .get();
    db.insert(tasks)
      .values({ title: "Orphan task", projectId: project.id })
      .run();

    db.delete(projects).run();

    const row = db.select().from(tasks).all()[0];
    expect(row.title).toBe("Orphan task");
    expect(row.projectId).toBeNull();
  });
});
