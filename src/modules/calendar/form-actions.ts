"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";

import { toActionResult } from "@/modules/tasks/action-result";
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

async function submit(operation: () => unknown): Promise<FormState> {
  const result = toActionResult(operation);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createEventFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.createEvent(db, {
      title: formString(formData, "title") ?? "",
      notes: formString(formData, "notes"),
      date: formString(formData, "date") ?? "",
      startTime: formString(formData, "startTime") || null,
      endTime: formString(formData, "endTime") || null,
    }),
  );
}

export async function updateEventFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.updateEvent(db, {
      id: formNumber(formData, "id") ?? Number.NaN,
      title: formString(formData, "title"),
      notes: formString(formData, "notes"),
      date: formString(formData, "date"),
      startTime: formData.has("startTime")
        ? formString(formData, "startTime") || null
        : undefined,
      endTime: formData.has("endTime")
        ? formString(formData, "endTime") || null
        : undefined,
    }),
  );
}

export async function deleteEventFormAction(formData: FormData): Promise<void> {
  await submit(() =>
    repo.deleteEvent(db, formNumber(formData, "id") ?? Number.NaN),
  );
}
