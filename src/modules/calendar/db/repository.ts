import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import type { Db } from "@/db/client";

import { isValidIsoDate } from "@/lib/date";

import { events } from "./schema";

export { events };
export type Event = typeof events.$inferSelect;

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";
export { NotFoundError, ValidationError };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/* --------------------------------- helpers --------------------------------- */

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`A ${field} is required.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`Invalid ${field}.`);
  }
  return value.trim();
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string" || !ISO_DATE.test(value) || !isValidIsoDate(value)) {
    throw new ValidationError(
      `Invalid date: ${JSON.stringify(value)}. Expected a real calendar date as YYYY-MM-DD.`,
    );
  }
  return value;
}

function normalizeTime(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || !TIME.test(value)) {
    throw new ValidationError(
      `Invalid ${field}: ${JSON.stringify(value)}. Expected HH:MM (24h).`,
    );
  }
  return value;
}

/**
 * The time window is optional but well-formed: an end time requires a start
 * time. end <= start is allowed — the event ends the next day (midnight
 * crossing), e.g. 22:00 → 02:00 or 09:00 → 09:00 (24h).
 */
function validateWindow(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): void {
  if (endTime && !startTime) {
    throw new ValidationError("An end time requires a start time.");
  }
}

function requireEvent(db: Db, id: number): Event {
  const found = db.select().from(events).where(eq(events.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown event id: ${id}.`);
  return found;
}

const nowIso = () => new Date().toISOString();

/* ----------------------------------- CRUD ---------------------------------- */

export interface CreateEventInput {
  title: string;
  notes?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}

export function createEvent(db: Db, input: CreateEventInput): Event {
  const startTime = normalizeTime(input.startTime, "start time");
  const endTime = normalizeTime(input.endTime, "end time");
  validateWindow(startTime, endTime);

  return db
    .insert(events)
    .values({
      title: requiredText(input.title, "title"),
      notes: optionalText(input.notes, "notes") ?? "",
      date: normalizeDate(input.date),
      startTime,
      endTime,
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export interface UpdateEventInput {
  id: number;
  title?: string;
  notes?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
}

export function updateEvent(db: Db, input: UpdateEventInput): Event {
  const existing = requireEvent(db, input.id);

  const patch: Partial<typeof events.$inferInsert> = { updatedAt: nowIso() };

  if (input.title !== undefined) patch.title = requiredText(input.title, "title");
  if (input.notes !== undefined)
    patch.notes = optionalText(input.notes, "notes") ?? "";
  if (input.date !== undefined) patch.date = normalizeDate(input.date);

  // Times are a pair: resolve against existing when only one side is patched.
  const nextStart =
    input.startTime !== undefined
      ? normalizeTime(input.startTime, "start time")
      : existing.startTime;
  const nextEnd =
    input.endTime !== undefined
      ? normalizeTime(input.endTime, "end time")
      : existing.endTime;

  validateWindow(nextStart, nextEnd);
  patch.startTime = nextStart;
  patch.endTime = nextEnd;

  return db
    .update(events)
    .set(patch)
    .where(eq(events.id, input.id))
    .returning()
    .get();
}

export function getEvent(db: Db, id: number): Event {
  return requireEvent(db, id);
}

export function deleteEvent(db: Db, id: number): void {
  requireEvent(db, id);
  db.delete(events).where(eq(events.id, id)).run();
}

/* ---------------------------------- queries -------------------------------- */

/**
 * Events whose date falls in [startDate, endDate], all-day first then by
 * start time. Rejects an inverted range.
 */
export function listEventsBetween(
  db: Db,
  startDate: string,
  endDate: string,
): Event[] {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (end < start) {
    throw new ValidationError(
      `Invalid range: start ${start} is after end ${end}.`,
    );
  }

  const allDayFirst = sql`${events.startTime} is not null`;
  const byStartTime = asc(events.startTime);

  return db
    .select()
    .from(events)
    .where(and(gte(events.date, start), lte(events.date, end)))
    .orderBy(allDayFirst, byStartTime, events.id)
    .all();
}
