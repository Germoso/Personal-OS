import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("listTasksByDueDateRange (S8)", () => {
  it("returns open tasks whose due date falls within the range, inclusive", () => {
    const first = repo.createTask(db, { title: "Lunes", dueDate: "2026-03-02" });
    const last = repo.createTask(db, { title: "Domingo", dueDate: "2026-03-08" });
    repo.createTask(db, { title: "Anterior", dueDate: "2026-03-01" });
    repo.createTask(db, { title: "Siguiente", dueDate: "2026-03-09" });

    const result = repo.listTasksByDueDateRange(db, "2026-03-02", "2026-03-08");
    expect(result.map((t) => t.id)).toEqual([first.id, last.id]);
  });

  it("excludes done tasks and tasks without a due date", () => {
    repo.createTask(db, { title: "Done", dueDate: "2026-03-03", status: "done" });
    repo.createTask(db, { title: "Sin fecha" });

    const result = repo.listTasksByDueDateRange(db, "2026-03-02", "2026-03-08");
    expect(result).toEqual([]);
  });

  it("rejects an invalid range", () => {
    expect(() =>
      repo.listTasksByDueDateRange(db, "2026-03-08", "2026-03-02"),
    ).toThrow(/range/i);
  });

  it("rejects malformed dates", () => {
    expect(() =>
      repo.listTasksByDueDateRange(db, "2026-02-30", "2026-03-08"),
    ).toThrow(/date/i);
  });
});
