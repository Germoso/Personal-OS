"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";

import { toActionResult, type ActionResult } from "./action-result";
import * as repo from "./db/repository";
import type { CreateProjectInput, UpdateProjectInput } from "./db/repository";
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "./db/repository";
import type { Project, Task } from "./db/types";

/**
 * The whole app reads from one SQLite file, so after a successful write we
 * revalidate the route tree instead of guessing which view showed the record.
 */
function revalidateApp(): void {
  revalidatePath("/", "layout");
}

/* ----------------------------------- tasks ---------------------------------- */

export async function createTaskAction(
  input: CreateTaskInput,
): Promise<ActionResult<Task>> {
  const result = toActionResult(() => repo.createTask(db, input));
  if (result.ok) revalidateApp();
  return result;
}

export async function updateTaskAction(
  input: UpdateTaskInput,
): Promise<ActionResult<Task>> {
  const result = toActionResult(() => repo.updateTask(db, input));
  if (result.ok) revalidateApp();
  return result;
}

export async function setTaskStatusAction(input: {
  id: number;
  status: repo.TaskStatus;
}): Promise<ActionResult<Task>> {
  const result = toActionResult(() => repo.setTaskStatus(db, input));
  if (result.ok) revalidateApp();
  return result;
}

export async function setTaskProjectAction(input: {
  id: number;
  projectId: number | null;
}): Promise<ActionResult<Task>> {
  const result = toActionResult(() => repo.setTaskProject(db, input));
  if (result.ok) revalidateApp();
  return result;
}

export async function deleteTaskAction(id: number): Promise<ActionResult<null>> {
  const result = toActionResult(() => {
    repo.deleteTask(db, id);
    return null;
  });
  if (result.ok) revalidateApp();
  return result;
}

/* ---------------------------------- projects -------------------------------- */

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<ActionResult<Project>> {
  const result = toActionResult(() => repo.createProject(db, input));
  if (result.ok) revalidateApp();
  return result;
}

export async function updateProjectAction(
  input: UpdateProjectInput,
): Promise<ActionResult<Project>> {
  const result = toActionResult(() => repo.updateProject(db, input));
  if (result.ok) revalidateApp();
  return result;
}

export async function archiveProjectAction(
  id: number,
): Promise<ActionResult<Project>> {
  const result = toActionResult(() => repo.archiveProject(db, id));
  if (result.ok) revalidateApp();
  return result;
}

export async function unarchiveProjectAction(
  id: number,
): Promise<ActionResult<Project>> {
  const result = toActionResult(() => repo.unarchiveProject(db, id));
  if (result.ok) revalidateApp();
  return result;
}

export async function deleteProjectAction(
  id: number,
): Promise<ActionResult<null>> {
  const result = toActionResult(() => {
    repo.deleteProject(db, id);
    return null;
  });
  if (result.ok) revalidateApp();
  return result;
}
