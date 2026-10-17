import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import { events } from "./schema";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("events table (S7)", () => {
  it("applies all-day defaults: no times, empty notes", () => {
    db.insert(events).values({ title: "Cumpleaños", date: "2026-02-14" }).run();

    const row = db.select().from(events).all()[0];
    expect(row).toMatchObject({
      title: "Cumpleaños",
      date: "2026-02-14",
      notes: "",
      startTime: null,
      endTime: null,
    });
  });

  it("stores a timed event with its notes", () => {
    db.insert(events)
      .values({
        title: "Reunión",
        date: "2026-02-14",
        startTime: "09:30",
        endTime: "10:15",
        notes: "Traer la propuesta",
      })
      .run();

    const row = db.select().from(events).all()[0];
    expect(row).toMatchObject({
      title: "Reunión",
      startTime: "09:30",
      endTime: "10:15",
      notes: "Traer la propuesta",
    });
  });

  it("requires title and date at the storage layer", () => {
    expect(() =>
      db.insert(events).values({ title: null, date: "2026-02-14" } as never).run(),
    ).toThrow(/title/i);
    expect(() =>
      db.insert(events).values({ title: "Sin fecha" } as never).run(),
    ).toThrow(/date/i);
    expect(db.select().from(events).all()).toEqual([]);
  });

  it("stamps created and updated timestamps", () => {
    const event = db
      .insert(events)
      .values({ title: "Sello", date: "2026-02-14" })
      .returning()
      .get();

    expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
