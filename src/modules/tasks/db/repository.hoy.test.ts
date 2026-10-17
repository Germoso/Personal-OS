import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

const TODAY = "2026-01-15";

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("listHoy (S4)", () => {
  it("includes tasks due today and overdue tasks", () => {
    const overdue = repo.createTask(db, { title: "overdue", dueDate: "2026-01-10" });
    const today = repo.createTask(db, { title: "today", dueDate: TODAY });

    expect(repo.listHoy(db, TODAY).map((t) => t.id)).toEqual([overdue.id, today.id]);
  });

  it("excludes tasks due in the future, without a due date, and done tasks", () => {
    repo.createTask(db, { title: "future", dueDate: "2026-01-16" });
    repo.createTask(db, { title: "no date" });
    repo.createTask(db, { title: "done", dueDate: "2026-01-10", status: "done" });

    expect(repo.listHoy(db, TODAY)).toEqual([]);
  });

  it("keeps in-progress tasks and orders by due date, then priority", () => {
    const later = repo.createTask(db, {
      title: "later",
      dueDate: "2026-01-15",
      status: "in_progress",
    });
    const earlierLow = repo.createTask(db, {
      title: "earlier low",
      dueDate: "2026-01-11",
      priority: "low",
    });
    const earlierHigh = repo.createTask(db, {
      title: "earlier high",
      dueDate: "2026-01-11",
      priority: "high",
    });

    expect(repo.listHoy(db, TODAY).map((t) => t.id)).toEqual([
      earlierHigh.id,
      earlierLow.id,
      later.id,
    ]);
  });
});
