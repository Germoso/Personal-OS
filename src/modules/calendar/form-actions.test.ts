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
  createEventFormAction,
  deleteEventFormAction,
  deleteEventFormActionState,
  updateEventFormAction,
} from "./form-actions";

function fd(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

beforeEach(() => {
  revalidatePath.mockClear();
  for (const event of repo.listEventsBetween(db, "2000-01-01", "2099-12-31"))
    repo.deleteEvent(db, event.id);
});

describe("createEventFormAction (S7)", () => {
  it("creates an all-day event from the form and revalidates", async () => {
    const state = await createEventFormAction(
      { ok: false },
      fd({ title: "  Cumpleaños  ", date: "2026-02-14" }),
    );

    expect(state).toEqual({ ok: true });
    expect(repo.listEventsBetween(db, "2026-02-14", "2026-02-14")).toMatchObject([
      { title: "Cumpleaños", startTime: null, endTime: null },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("creates a timed event", async () => {
    const state = await createEventFormAction(
      { ok: false },
      fd({
        title: "Reunión",
        date: "2026-02-14",
        startTime: "09:30",
        endTime: "10:15",
        notes: "Traer propuesta",
      }),
    );

    expect(state).toEqual({ ok: true });
    expect(repo.listEventsBetween(db, "2026-02-14", "2026-02-14")[0]).toMatchObject({
      startTime: "09:30",
      endTime: "10:15",
      notes: "Traer propuesta",
    });
  });

  it("returns the validation message and stores nothing", async () => {
    const state = await createEventFormAction({ ok: false }, fd({ title: "   ", date: "2026-02-14" }));

    expect(state).toEqual({ ok: false, error: "A title is required." });
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an end time without a start time", async () => {
    const state = await createEventFormAction(
      { ok: false },
      fd({ title: "A", date: "2026-02-14", endTime: "10:00" }),
    );

    expect(state.ok).toBe(false);
    expect(state.error).toMatch(/start time/i);
  });

  it("creates a midnight-crossing event from the form", async () => {
    const state = await createEventFormAction(
      { ok: false },
      fd({
        title: "Concierto",
        date: "2026-02-14",
        startTime: "22:00",
        endTime: "02:00",
      }),
    );

    expect(state).toEqual({ ok: true });
    expect(repo.getEvent(db, repo.listEventsBetween(db, "2026-02-14", "2026-02-14")[0].id)).toMatchObject({
      startTime: "22:00",
      endTime: "02:00",
    });
  });
});

describe("updateEventFormAction (S7)", () => {
  it("updates the event from the form", async () => {
    const event = repo.createEvent(db, { title: "Viejo", date: "2026-02-14" });

    const state = await updateEventFormAction(
      { ok: false },
      fd({
        id: String(event.id),
        title: "Nuevo",
        date: "2026-02-15",
        startTime: "08:00",
        endTime: "09:00",
      }),
    );

    expect(state).toEqual({ ok: true });
    expect(repo.getEvent(db, event.id)).toMatchObject({
      title: "Nuevo",
      date: "2026-02-15",
      startTime: "08:00",
      endTime: "09:00",
    });
  });

  it("turns a timed event back into an all-day event", async () => {
    const event = repo.createEvent(db, {
      title: "Con hora",
      date: "2026-02-14",
      startTime: "09:00",
      endTime: "10:00",
    });

    const state = await updateEventFormAction(
      { ok: false },
      fd({ id: String(event.id), startTime: "", endTime: "" }),
    );

    expect(state).toEqual({ ok: true });
    expect(repo.getEvent(db, event.id).startTime).toBeNull();
    expect(repo.getEvent(db, event.id).endTime).toBeNull();
  });
});

describe("deleteEventFormAction (S7)", () => {
  it("deletes an event and revalidates", async () => {
    const event = repo.createEvent(db, { title: "Efímero", date: "2026-02-14" });

    await deleteEventFormAction(fd({ id: String(event.id) }));
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("deletes with the useActionState variant used by the dialog", async () => {
    const event = repo.createEvent(db, { title: "Del grid", date: "2026-02-14" });

    const state = await deleteEventFormActionState(
      { ok: false },
      fd({ id: String(event.id) }),
    );
    expect(state).toEqual({ ok: true });
    expect(repo.listEventsBetween(db, "2000-01-01", "2099-12-31")).toEqual([]);
  });
});
