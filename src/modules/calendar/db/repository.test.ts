import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("createEvent (S7)", () => {
  it("creates an all-day event by default", () => {
    const event = repo.createEvent(db, { title: "Cumpleaños", date: "2026-02-14" });

    expect(event).toMatchObject({
      title: "Cumpleaños",
      date: "2026-02-14",
      notes: "",
      startTime: null,
      endTime: null,
    });
  });

  it("creates a timed event with notes and trims the title", () => {
    const event = repo.createEvent(db, {
      title: "  Reunión  ",
      date: "2026-02-14",
      startTime: "09:30",
      endTime: "10:15",
      notes: "Traer la propuesta",
    });

    expect(event).toMatchObject({
      title: "Reunión",
      startTime: "09:30",
      endTime: "10:15",
      notes: "Traer la propuesta",
    });
  });

  it("allows a start time with an open end", () => {
    const event = repo.createEvent(db, {
      title: "Bloque de foco",
      date: "2026-02-14",
      startTime: "14:00",
    });

    expect(event.startTime).toBe("14:00");
    expect(event.endTime).toBeNull();
  });

  it("rejects a blank title and stores nothing", () => {
    expect(() => repo.createEvent(db, { title: "   ", date: "2026-02-14" })).toThrow(
      /title/i,
    );
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
  });

  it("rejects impossible and malformed dates", () => {
    for (const date of ["2026-02-30", "2026-13-01", "14-02-2026", ""]) {
      expect(() => repo.createEvent(db, { title: "A", date })).toThrow(/date/i);
    }
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
  });

  it("rejects malformed times and an end without a start", () => {
    const base = { title: "A", date: "2026-02-14" };

    expect(() => repo.createEvent(db, { ...base, startTime: "9:30" })).toThrow(/time/i);
    expect(() => repo.createEvent(db, { ...base, startTime: "25:00" })).toThrow(/time/i);
    expect(() => repo.createEvent(db, { ...base, endTime: "10:00" })).toThrow(
      /start time/i,
    );
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
  });

  it("allows an end time that crosses midnight (end <= start = next day)", () => {
    const overnight = repo.createEvent(db, {
      title: "Noche",
      date: "2026-02-14",
      startTime: "22:00",
      endTime: "02:00",
    });
    const fullDay = repo.createEvent(db, {
      title: "Todo el día y más",
      date: "2026-02-15",
      startTime: "09:00",
      endTime: "09:00",
    });

    expect(overnight).toMatchObject({ startTime: "22:00", endTime: "02:00" });
    expect(fullDay).toMatchObject({ startTime: "09:00", endTime: "09:00" });
  });
});

describe("updateEvent (S7)", () => {
  it("updates title, notes, date and times", () => {
    const event = repo.createEvent(db, { title: "Viejo", date: "2026-02-14" });

    const updated = repo.updateEvent(db, {
      id: event.id,
      title: "Nuevo",
      notes: "Nota",
      date: "2026-02-15",
      startTime: "08:00",
      endTime: "09:00",
    });

    expect(updated).toMatchObject({
      id: event.id,
      title: "Nuevo",
      notes: "Nota",
      date: "2026-02-15",
      startTime: "08:00",
      endTime: "09:00",
    });
  });

  it("turns a timed event back into an all-day event", () => {
    const event = repo.createEvent(db, {
      title: "Con hora",
      date: "2026-02-14",
      startTime: "09:00",
      endTime: "10:00",
    });

    const updated = repo.updateEvent(db, {
      id: event.id,
      startTime: null,
      endTime: null,
    });

    expect(updated.startTime).toBeNull();
    expect(updated.endTime).toBeNull();
  });

  it("rejects an unknown id and keeps existing rows untouched", () => {
    expect(() => repo.updateEvent(db, { id: 404, title: "X" })).toThrow(/event/i);
  });

  it("rejects an invalid patch and keeps the previous value", () => {
    const event = repo.createEvent(db, { title: "Original", date: "2026-02-14" });

    expect(() => repo.updateEvent(db, { id: event.id, date: "2026-02-30" })).toThrow(
      /date/i,
    );
    expect(repo.getEvent(db, event.id).date).toBe("2026-02-14");
  });

  it("allows the end time to cross midnight on update", () => {
    const event = repo.createEvent(db, {
      title: "Con hora",
      date: "2026-02-14",
      startTime: "09:00",
      endTime: "10:00",
    });

    const updated = repo.updateEvent(db, { id: event.id, endTime: "08:00" });
    expect(updated.endTime).toBe("08:00");
  });

  it("still rejects an end time without a start time on update", () => {
    const event = repo.createEvent(db, {
      title: "Con hora",
      date: "2026-02-14",
      startTime: "09:00",
      endTime: "10:00",
    });

    expect(() => repo.updateEvent(db, { id: event.id, startTime: null })).toThrow(
      /start time/i,
    );
  });
});

describe("getEvent and deleteEvent (S7)", () => {
  it("deletes an event and reports an unknown id", () => {
    const event = repo.createEvent(db, { title: "Efímero", date: "2026-02-14" });

    repo.deleteEvent(db, event.id);
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
    expect(() => repo.deleteEvent(db, event.id)).toThrow(/event/i);
    expect(() => repo.getEvent(db, event.id)).toThrow(/event/i);
  });
});

describe("listEventsBetween (S8)", () => {
  it("includes both boundaries and excludes outside days", () => {
    const first = repo.createEvent(db, { title: "Lunes", date: "2026-03-02" });
    const last = repo.createEvent(db, { title: "Domingo", date: "2026-03-08" });
    repo.createEvent(db, { title: "Anterior", date: "2026-03-01" });
    repo.createEvent(db, { title: "Siguiente", date: "2026-03-09" });

    expect(
      repo.listEventsBetween(db, "2026-03-02", "2026-03-08").map((e) => e.id),
    ).toEqual([first.id, last.id]);
  });

  it("orders all-day events first, then by start time", () => {
    const allDay = repo.createEvent(db, { title: "Todo el día", date: "2026-03-02" });
    const late = repo.createEvent(db, {
      title: "Tarde",
      date: "2026-03-02",
      startTime: "18:00",
    });
    const early = repo.createEvent(db, {
      title: "Temprano",
      date: "2026-03-02",
      startTime: "08:00",
    });

    expect(
      repo.listEventsBetween(db, "2026-03-02", "2026-03-02").map((e) => e.id),
    ).toEqual([allDay.id, early.id, late.id]);
  });

  it("rejects an invalid range", () => {
    expect(() => repo.listEventsBetween(db, "2026-03-08", "2026-03-02")).toThrow(
      /range/i,
    );
  });
});
