import { and, eq, gte, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";

import type { Db } from "@/db/client";

import { isValidIsoDate } from "@/lib/date";

import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  projects,
  tasks,
} from "./schema";

export { projects, tasks };
export type { Project, Task } from "./types";
export {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./schema";

import type { Project, Task } from "./types";

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${field}: ${JSON.stringify(value)}. Expected one of ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

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

function normalizeDueDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !ISO_DATE.test(value) || !isValidIsoDate(value)) {
    throw new ValidationError(
      `Invalid due date: ${JSON.stringify(value)}. Expected YYYY-MM-DD.`,
    );
  }
  return value;
}

function normalizeScheduleDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !ISO_DATE.test(value) || !isValidIsoDate(value)) {
    throw new ValidationError(
      `Invalid schedule date: ${JSON.stringify(value)}. Expected YYYY-MM-DD.`,
    );
  }
  return value;
}

function normalizeScheduleTime(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !TIME.test(value)) {
    throw new ValidationError(
      `Invalid ${field}: ${JSON.stringify(value)}. Expected HH:MM (24h).`,
    );
  }
  return value;
}

/**
 * A task's time window is optional but must be well-formed: an end time
 * requires a start time, and a start time requires a schedule date (a timed
 * task without a date cannot be placed on the grid). end <= start is allowed:
 * the window ends the next day (midnight crossing).
 */
function validateScheduleWindow(
  scheduleDate: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): void {
  if (endTime && !startTime) {
    throw new ValidationError("An end time requires a start time.");
  }
  if (startTime && !scheduleDate) {
    throw new ValidationError("A start time requires a schedule date.");
  }
}

function normalizeColor(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    throw new ValidationError(
      `Invalid color: ${JSON.stringify(value)}. Expected #rrggbb.`,
    );
  }
  return value.trim().toLowerCase();
}

function requireProject(db: Db, projectId: number): Project {
  const found = db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (!found) throw new NotFoundError(`Unknown project id: ${projectId}.`);
  return found;
}

function requireTask(db: Db, id: number): Task {
  const found = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown task id: ${id}.`);
  return found;
}

const nowIso = () => new Date().toISOString();

/* ---------------------------------- projects --------------------------------- */

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  status?: (typeof PROJECT_STATUSES)[number];
}

export function createProject(db: Db, input: CreateProjectInput): Project {
  const row = db
    .insert(projects)
    .values({
      name: requiredText(input.name, "name"),
      description: optionalText(input.description, "description") ?? "",
      color: normalizeColor(input.color),
      status:
        input.status === undefined
          ? undefined
          : oneOf(input.status, PROJECT_STATUSES, "status"),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
  return row;
}

export interface UpdateProjectInput {
  id: number;
  name?: string;
  description?: string;
  color?: string;
  status?: (typeof PROJECT_STATUSES)[number];
}

export function updateProject(db: Db, input: UpdateProjectInput): Project {
  requireProject(db, input.id);

  const patch: Partial<typeof projects.$inferInsert> = { updatedAt: nowIso() };
  if (input.name !== undefined) patch.name = requiredText(input.name, "name");
  if (input.description !== undefined)
    patch.description = optionalText(input.description, "description") ?? "";
  if (input.color !== undefined) patch.color = normalizeColor(input.color);
  if (input.status !== undefined)
    patch.status = oneOf(input.status, PROJECT_STATUSES, "status");

  return db
    .update(projects)
    .set(patch)
    .where(eq(projects.id, input.id))
    .returning()
    .get();
}

export function archiveProject(db: Db, id: number): Project {
  return updateProject(db, { id, status: "archived" });
}

export function unarchiveProject(db: Db, id: number): Project {
  return updateProject(db, { id, status: "active" });
}

export function getProject(db: Db, id: number): Project {
  return requireProject(db, id);
}

export function deleteProject(db: Db, id: number): void {
  requireProject(db, id);
  // ON DELETE SET NULL keeps the tasks alive in the Inbox (S3)
  db.delete(projects).where(eq(projects.id, id)).run();
}

export interface ListProjectsFilters {
  status?: (typeof PROJECT_STATUSES)[number];
}

export function listProjects(
  db: Db,
  filters: ListProjectsFilters = {},
): Project[] {
  return db
    .select()
    .from(projects)
    .where(filters.status ? eq(projects.status, filters.status) : undefined)
    .orderBy(projects.createdAt, projects.id)
    .all();
}

/* ------------------------------------ tasks ---------------------------------- */

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface CreateTaskInput {
  title: string;
  notes?: string;
  projectId?: number | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  scheduleDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

function resolveProjectId(db: Db, value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ValidationError("Invalid project id.");
  requireProject(db, id);
  return id;
}

export function createTask(db: Db, input: CreateTaskInput): Task {
  const projectId =
    input.projectId === undefined || input.projectId === null
      ? undefined
      : resolveProjectId(db, input.projectId);

  const scheduleDate = normalizeScheduleDate(input.scheduleDate);
  const startTime = normalizeScheduleTime(input.startTime, "start time");
  const endTime = normalizeScheduleTime(input.endTime, "end time");
  validateScheduleWindow(scheduleDate, startTime, endTime);

  const row = db
    .insert(tasks)
    .values({
      title: requiredText(input.title, "title"),
      notes: optionalText(input.notes, "notes") ?? "",
      projectId,
      status:
        input.status === undefined ? undefined : oneOf(input.status, TASK_STATUSES, "status"),
      priority:
        input.priority === undefined
          ? undefined
          : oneOf(input.priority, TASK_PRIORITIES, "priority"),
      dueDate: normalizeDueDate(input.dueDate),
      scheduleDate,
      startTime,
      endTime,
      updatedAt: nowIso(),
    })
    .returning()
    .get();
  return row;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  notes?: string;
  projectId?: number | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  scheduleDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export function updateTask(db: Db, input: UpdateTaskInput): Task {
  const existing = requireTask(db, input.id);

  const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: nowIso() };
  if (input.title !== undefined) patch.title = requiredText(input.title, "title");
  if (input.notes !== undefined)
    patch.notes = optionalText(input.notes, "notes") ?? "";
  if (input.projectId !== undefined)
    patch.projectId = resolveProjectId(db, input.projectId);
  if (input.status !== undefined)
    patch.status = oneOf(input.status, TASK_STATUSES, "status");
  if (input.priority !== undefined)
    patch.priority = oneOf(input.priority, TASK_PRIORITIES, "priority");
  if (input.dueDate !== undefined) patch.dueDate = normalizeDueDate(input.dueDate);

  // The schedule window is a pair: resolve against the existing row when only
  // one side is patched, so a partial form cannot unset the other side.
  const nextSchedule =
    input.scheduleDate !== undefined
      ? normalizeScheduleDate(input.scheduleDate)
      : existing.scheduleDate;
  const nextStart =
    input.startTime !== undefined
      ? normalizeScheduleTime(input.startTime, "start time")
      : existing.startTime;
  const nextEnd =
    input.endTime !== undefined
      ? normalizeScheduleTime(input.endTime, "end time")
      : existing.endTime;
  validateScheduleWindow(nextSchedule, nextStart, nextEnd);
  patch.scheduleDate = nextSchedule;
  patch.startTime = nextStart;
  patch.endTime = nextEnd;

  return db
    .update(tasks)
    .set(patch)
    .where(eq(tasks.id, input.id))
    .returning()
    .get();
}

export function setTaskStatus(
  db: Db,
  input: { id: number; status: TaskStatus },
): Task {
  return updateTask(db, {
    id: input.id,
    status: oneOf(input.status, TASK_STATUSES, "status"),
  });
}

export function setTaskProject(
  db: Db,
  input: { id: number; projectId: number | null },
): Task {
  // The task is the subject of the operation: validate it before the project.
  requireTask(db, input.id);
  return updateTask(db, {
    id: input.id,
    projectId: resolveProjectId(db, input.projectId),
  });
}

export function deleteTask(db: Db, id: number): void {
  requireTask(db, id);
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

/* ----------------------------------- queries --------------------------------- */

export interface ListTasksFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
}

const priorityRank = sql`case ${tasks.priority} when 'high' then 0 when 'medium' then 1 else 2 end`;
const defaultOrder = [
  sql`${tasks.dueDate} is null`,
  priorityRank,
  tasks.createdAt,
];

function whereAll(...conditions: (SQL | undefined)[]) {
  const defined = conditions.filter((c): c is SQL => c !== undefined);
  return defined.length > 0 ? and(...defined) : undefined;
}

export function listTasks(db: Db, filters: ListTasksFilters = {}): Task[] {
  return db
    .select()
    .from(tasks)
    .where(
      whereAll(
        filters.status && eq(tasks.status, filters.status),
        filters.priority && eq(tasks.priority, filters.priority),
      ),
    )
    .orderBy(...defaultOrder)
    .all();
}

export function listInbox(db: Db): Task[] {
  return db
    .select()
    .from(tasks)
    .where(isNull(tasks.projectId))
    .orderBy(...defaultOrder)
    .all();
}

export function listByProject(db: Db, projectId: number): Task[] {
  requireProject(db, projectId);
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(...defaultOrder)
    .all();
}

/**
 * "Hoy" view: overdue plus due-today tasks that are still open. Tasks without a
 * due date and finished tasks stay out of it.
 */
export function listHoy(db: Db, today: string): Task[] {
  const dueToday = normalizeDueDate(today);
  if (typeof dueToday !== "string") {
    throw new ValidationError(`Invalid today date: ${JSON.stringify(today)}.`);
  }
  return db
    .select()
    .from(tasks)
    .where(and(lte(tasks.dueDate, dueToday), ne(tasks.status, "done")))
    .orderBy(tasks.dueDate, priorityRank, tasks.createdAt)
    .all();
}

/* ---------------------------------- calendar -------------------------------- */

/**
 * Open tasks whose due date falls in [startDate, endDate], inclusive. Used by
 * the weekly calendar view. Rejects an inverted range.
 */
export function listTasksByDueDateRange(
  db: Db,
  startDate: string,
  endDate: string,
): Task[] {
  const start = normalizeDueDate(startDate);
  const end = normalizeDueDate(endDate);
  if (typeof start !== "string" || typeof end !== "string") {
    throw new ValidationError(
      `Invalid range: ${JSON.stringify(startDate)} to ${JSON.stringify(endDate)}.`,
    );
  }
  if (end < start) {
    throw new ValidationError(
      `Invalid range: start ${start} is after end ${end}.`,
    );
  }
  return db
    .select()
    .from(tasks)
    .where(
      and(
        gte(tasks.dueDate, start),
        lte(tasks.dueDate, end),
        ne(tasks.status, "done"),
      ),
    )
    .orderBy(tasks.dueDate, priorityRank, tasks.createdAt)
    .all();
}

/**
 * Tasks visible in the calendar week [startDate, endDate]: tasks scheduled on
 * a date inside the range (whether timed or all-day), plus tasks without a
 * schedule date whose due date falls inside the range — those show up as
 * unscheduled all-day tasks on their due date. Done tasks stay out. Rejects an
 * inverted range.
 */
export function listTasksForCalendar(
  db: Db,
  startDate: string,
  endDate: string,
): Task[] {
  const start = normalizeDueDate(startDate);
  const end = normalizeDueDate(endDate);
  if (typeof start !== "string" || typeof end !== "string") {
    throw new ValidationError(
      `Invalid range: ${JSON.stringify(startDate)} to ${JSON.stringify(endDate)}.`,
    );
  }
  if (end < start) {
    throw new ValidationError(
      `Invalid range: start ${start} is after end ${end}.`,
    );
  }
  return db
    .select()
    .from(tasks)
    .where(
      and(
        or(
          and(gte(tasks.scheduleDate, start), lte(tasks.scheduleDate, end)),
          and(
            isNull(tasks.scheduleDate),
            gte(tasks.dueDate, start),
            lte(tasks.dueDate, end),
          ),
        ),
        ne(tasks.status, "done"),
      ),
    )
    .orderBy(tasks.scheduleDate, tasks.dueDate, tasks.createdAt, tasks.id)
    .all();
}
