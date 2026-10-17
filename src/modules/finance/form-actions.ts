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

/* -------------------------------- accounts -------------------------------- */

export async function createAccountFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.createAccount(db, {
      name: formString(formData, "name") ?? "",
      type: formString(formData, "type") as repo.Account["type"] | undefined,
      currency: formString(formData, "currency"),
      openingBalance: formNumber(formData, "openingBalance"),
    }),
  );
}

export async function updateAccountFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.updateAccount(db, {
      id: formNumber(formData, "id") ?? Number.NaN,
      name: formString(formData, "name"),
      type: formString(formData, "type") as repo.Account["type"] | undefined,
      currency: formString(formData, "currency"),
      openingBalance: formNumber(formData, "openingBalance"),
      status: formString(formData, "status") as repo.Account["status"] | undefined,
    }),
  );
}

export async function archiveAccountFormAction(formData: FormData): Promise<void> {
  await submit(() =>
    formString(formData, "status") === "active"
      ? repo.unarchiveAccount(db, formNumber(formData, "id") ?? Number.NaN)
      : repo.archiveAccount(db, formNumber(formData, "id") ?? Number.NaN),
  );
}

export async function deleteAccountFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteAccount(db, formNumber(formData, "id") ?? Number.NaN));
}

/* ------------------------------- categories -------------------------------- */

export async function createCategoryFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.createCategory(db, {
      name: formString(formData, "name") ?? "",
      kind: (formString(formData, "kind") ?? "") as repo.Category["kind"],
      color: formString(formData, "color"),
    }),
  );
}

export async function updateCategoryFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.updateCategory(db, {
      id: formNumber(formData, "id") ?? Number.NaN,
      name: formString(formData, "name"),
      kind: formString(formData, "kind") as repo.Category["kind"] | undefined,
      color: formString(formData, "color"),
    }),
  );
}

export async function deleteCategoryFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteCategory(db, formNumber(formData, "id") ?? Number.NaN));
}

/* ------------------------------ transactions ------------------------------- */

export async function createTransactionFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.createTransaction(db, {
      accountId: formNumber(formData, "accountId") ?? Number.NaN,
      amount: formNumber(formData, "amount") ?? Number.NaN,
      date: formString(formData, "date") ?? "",
      description: formString(formData, "description"),
      categoryId:
        formData.has("categoryId")
          ? formString(formData, "categoryId") === ""
            ? null
            : Number(formString(formData, "categoryId"))
          : undefined,
      status: formString(formData, "status") as repo.Transaction["status"] | undefined,
    }),
  );
}

export async function updateTransactionFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(() =>
    repo.updateTransaction(db, {
      id: formNumber(formData, "id") ?? Number.NaN,
      accountId: formNumber(formData, "accountId"),
      amount: formNumber(formData, "amount"),
      date: formString(formData, "date"),
      description: formString(formData, "description"),
      categoryId: formData.has("categoryId")
        ? formString(formData, "categoryId") === ""
          ? null
          : Number(formString(formData, "categoryId"))
        : undefined,
      status: formString(formData, "status") as repo.Transaction["status"] | undefined,
    }),
  );
}

export async function deleteTransactionFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteTransaction(db, formNumber(formData, "id") ?? Number.NaN));
}
