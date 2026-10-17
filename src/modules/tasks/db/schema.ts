import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "@/db/columns";

export const PROJECT_STATUSES = ["active", "archived"] as const;
export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["high", "medium", "low"] as const;

export const DEFAULT_PROJECT_COLOR = "#6366f1";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default(DEFAULT_PROJECT_COLOR),
  status: text("status", { enum: PROJECT_STATUSES })
    .notNull()
    .default("active"),
  ...timestamps,
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    // null projectId means the task lives in the Inbox (S3)
    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: TASK_STATUSES })
      .notNull()
      .default("pending"),
    priority: text("priority", { enum: TASK_PRIORITIES })
      .notNull()
      .default("medium"),
    // ISO date (YYYY-MM-DD), optional
    dueDate: text("due_date"),
    // Optional calendar scheduling: the day the task is placed on the time
    // grid and its window (HH:MM 24h, local). Both times null = all-day task;
    // end <= start means the window ends the next day (midnight crossing).
    scheduleDate: text("schedule_date"),
    startTime: text("start_time"),
    endTime: text("end_time"),
    ...timestamps,
  },
  (table) => [
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_due_date_idx").on(table.dueDate),
    index("tasks_schedule_date_idx").on(table.scheduleDate),
  ],
);
