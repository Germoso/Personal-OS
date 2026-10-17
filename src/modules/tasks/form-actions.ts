"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";

import { toActionResult } from "./action-result";
import * as repo from "./db/repository";

export interface FormState {
  ok: boolean;
  error?: string;
}

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function formNumber(formData: FormData, key: string): number | undefined {
  const raw = formString(formData, key);
  if (raw === undefined || raw === "") return undefined;
  return Number(raw);
}

/** "" and missing both mean "no project" (Inbox). */
function formProjectId(formData: FormData): number | null | undefined {
  if (!formData.has("projectId")) return undefined;
  const raw = formString(formData, "projectId") ?? "";
  return raw === "" ? null : Number(raw);
}

async function submit(operation: () => unknown): Promise<FormState> {
  const result = toActionResult(operation);
  if (!result.ok) return { ok: false, error: result.error };
  // One SQLite file feeds every view: refresh the whole route tree.
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ----------------------------------- tasks ---------------------------------- */

export async function createTaskFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.createTask(db, {
      title: formString(formData, "title") ?? "",
      notes: formString(formData, "notes"),
      projectId: formProjectId(formData),
      priority: formString(formData, "priority") as repo.TaskPriority | undefined,
      dueDate: formString(formData, "dueDate") || null,
    }),
  );
}

export async function updateTaskFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.updateTask(db, {
      id: formNumber(formData, "id") ?? Number.NaN,
      title: formString(formData, "title"),
      notes: formString(formData, "notes"),
      projectId: formProjectId(formData),
      status: formString(formData, "status") as repo.TaskStatus | undefined,
      priority: formString(formData, "priority") as repo.TaskPriority | undefined,
      dueDate: formData.has("dueDate")
        ? formString(formData, "dueDate") || null
        : undefined,
    }),
  );
}

/** Plain (non-useActionState) form: sets status and comes back to the page. */
export async function setTaskStatusFormAction(formData: FormData): Promise<void> {
  await submit(() =>
    repo.setTaskStatus(db, {
      id: formNumber(formData, "id") ?? Number.NaN,
      status: (formString(formData, "status") ?? "") as repo.TaskStatus,
    }),
  );
}

export async function deleteTaskFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteTask(db, formNumber(formData, "id") ?? Number.NaN));
}

/* ---------------------------------- projects -------------------------------- */

export async function createProjectFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.createProject(db, {
      name: formString(formData, "name") ?? "",
      description: formString(formData, "description"),
      color: formString(formData, "color"),
    }),
  );
}

export async function archiveProjectFormAction(formData: FormData): Promise<void> {
  const id = formNumber(formData, "id") ?? Number.NaN;
  await submit(() =>
    formString(formData, "status") === "active"
      ? repo.unarchiveProject(db, id)
      : repo.archiveProject(db, id),
  );
}

export async function deleteProjectFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteProject(db, formNumber(formData, "id") ?? Number.NaN));
}
