import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
};

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
    ...timestamps,
  },
  (table) => [
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_due_date_idx").on(table.dueDate),
  ],
);
