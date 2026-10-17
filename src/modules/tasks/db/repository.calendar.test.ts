import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("task scheduling (S9)", () => {
  it("stores an optional schedule date and a time window", () => {
    const task = repo.createTask(db, {
      title: "Bloque de foco",
      scheduleDate: "2026-03-04",
      startTime: "09:30",
      endTime: "10:45",
    });

    expect(task).toMatchObject({
      scheduleDate: "2026-03-04",
      startTime: "09:30",
      endTime: "10:45",
      dueDate: null,
    });
  });

  it("stores a schedule date with no times (all-day task)", () => {
    const task = repo.createTask(db, {
      title: "Día de limpieza",
      scheduleDate: "2026-03-05",
    });

    expect(task).toMatchObject({ scheduleDate: "2026-03-05", startTime: null, endTime: null });
  });

  it("allows an end time that crosses midnight (end <= start)", () => {
    const task = repo.createTask(db, {
      title: "Turno de noche",
      scheduleDate: "2026-03-06",
      startTime: "22:00",
      endTime: "02:00",
    });

    expect(task).toMatchObject({ startTime: "22:00", endTime: "02:00" });
  });

  it("rejects an end time without a start time", () => {
    expect(() =>
      repo.createTask(db, {
        title: "Rota",
        scheduleDate: "2026-03-06",
        endTime: "10:00",
      }),
    ).toThrow(/start time/i);
  });

  it("rejects a start time without a schedule date", () => {
    expect(() =>
      repo.createTask(db, { title: "Rota", startTime: "10:00" }),
    ).toThrow(/schedule date/i);
  });

  it("rejects malformed schedule dates and times", () => {
    expect(() =>
      repo.createTask(db, { title: "A", scheduleDate: "2026-02-30" }),
    ).toThrow(/schedule date/i);
    expect(() =>
      repo.createTask(db, { title: "A", scheduleDate: "2026-03-06", startTime: "9:30" }),
    ).toThrow(/time/i);
    expect(() =>
      repo.createTask(db, { title: "A", scheduleDate: "2026-03-06", startTime: "25:00" }),
    ).toThrow(/time/i);
  });

  it("updates and clears the schedule window", () => {
    const task = repo.createTask(db, {
      title: "Flexible",
      scheduleDate: "2026-03-06",
      startTime: "10:00",
      endTime: "11:00",
    });

    const moved = repo.updateTask(db, {
      id: task.id,
      scheduleDate: "2026-03-07",
      startTime: "12:00",
      endTime: "13:30",
    });
    expect(moved).toMatchObject({
      scheduleDate: "2026-03-07",
      startTime: "12:00",
      endTime: "13:30",
    });

    const untimed = repo.updateTask(db, {
      id: task.id,
      startTime: null,
      endTime: null,
    });
    expect(untimed).toMatchObject({ scheduleDate: "2026-03-07", startTime: null, endTime: null });

    const unscheduled = repo.updateTask(db, { id: task.id, scheduleDate: null });
    expect(unscheduled.scheduleDate).toBeNull();
  });

  it("keeps pairing consistency when patching one side only", () => {
    const task = repo.createTask(db, {
      title: "Con horario",
      scheduleDate: "2026-03-06",
      startTime: "10:00",
      endTime: "11:00",
    });

    // Patching only the end time resolves the rest against the stored row.
    expect(repo.updateTask(db, { id: task.id, endTime: "12:00" }).endTime).toBe("12:00");

    // Clearing just the schedule date while times remain is inconsistent.
    expect(() => repo.updateTask(db, { id: task.id, scheduleDate: null })).toThrow(
      /schedule date/i,
    );
  });
});

describe("listTasksForCalendar (S9)", () => {
  it("returns tasks scheduled inside the range", () => {
    const inside = repo.createTask(db, {
      title: "Dentro",
      scheduleDate: "2026-03-04",
      startTime: "10:00",
    });
    const allDay = repo.createTask(db, { title: "Día libre", scheduleDate: "2026-03-03" });
    repo.createTask(db, { title: "Fuera", scheduleDate: "2026-03-09" });
    repo.createTask(db, { title: "Sin agendar", dueDate: "2026-04-01" });

    const result = repo.listTasksForCalendar(db, "2026-03-02", "2026-03-08");
    expect(result.map((t) => t.id)).toEqual([allDay.id, inside.id]);
  });

  it("includes unscheduled tasks by their due date (all-day band)", () => {
    const dueInside = repo.createTask(db, { title: "X", dueDate: "2026-03-04" });
    const scheduledElsewhere = repo.createTask(db, {
      title: "Y",
      scheduleDate: "2026-03-05",
      dueDate: "2026-04-01",
    });
    const outside = repo.createTask(db, { title: "Z", dueDate: "2026-03-01" });
    repo.createTask(db, { title: "Sin fecha" });

    const result = repo.listTasksForCalendar(db, "2026-03-02", "2026-03-08");
    const ids = result.map((t) => t.id);
    expect(ids).toContain(dueInside.id);
    expect(ids).toContain(scheduledElsewhere.id);
    expect(ids).not.toContain(outside.id);
    expect(result).toHaveLength(2);
  });

  it("excludes done tasks", () => {
    repo.createTask(db, {
      title: "Hecha",
      scheduleDate: "2026-03-04",
      status: "done",
    });

    expect(repo.listTasksForCalendar(db, "2026-03-02", "2026-03-08")).toEqual([]);
  });

  it("rejects an inverted range", () => {
    expect(() =>
      repo.listTasksForCalendar(db, "2026-03-08", "2026-03-02"),
    ).toThrow(/range/i);
  });
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
