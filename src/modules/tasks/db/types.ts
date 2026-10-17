import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  projects,
  tasks,
} from "./schema";

export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
