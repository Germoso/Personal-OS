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

/* ------------------------------- ingredients ------------------------------- */

export async function createIngredientFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(() =>
    repo.createIngredient(db, {
      name: formString(formData, "name") ?? "",
      unit: formString(formData, "unit"),
      category: formString(formData, "category"),
    }),
  );
}

export async function deleteIngredientFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteIngredient(db, formNumber(formData, "id") ?? Number.NaN));
}

/* -------------------------------- recipes ---------------------------------- */

export async function createRecipeFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(() =>
    repo.createRecipe(db, {
      title: formString(formData, "title") ?? "",
      description: formString(formData, "description"),
      servings: formNumber(formData, "servings"),
      instructions: formString(formData, "instructions"),
    }),
  );
}

export async function deleteRecipeFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteRecipe(db, formNumber(formData, "id") ?? Number.NaN));
}

export async function addRecipeIngredientFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(() =>
    repo.addRecipeIngredient(db, {
      recipeId: formNumber(formData, "recipeId") ?? Number.NaN,
      ingredientId: formNumber(formData, "ingredientId") ?? Number.NaN,
      quantity: formNumber(formData, "quantity") ?? Number.NaN,
      unit: formString(formData, "unit"),
    }),
  );
}

export async function removeRecipeIngredientFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.removeRecipeIngredient(db, formNumber(formData, "id") ?? Number.NaN));
}

export async function addRecipeToShoppingListFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.addRecipeToShoppingList(db, formNumber(formData, "recipeId") ?? Number.NaN));
}

/* ------------------------------- shopping ----------------------------------- */

export async function addShoppingItemFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(() =>
    repo.addShoppingItem(db, {
      ingredientId: formData.has("ingredientId") && formString(formData, "ingredientId") !== ""
        ? Number(formString(formData, "ingredientId"))
        : null,
      freeText: formString(formData, "freeText"),
      quantity: formNumber(formData, "quantity"),
      unit: formString(formData, "unit"),
      source: "manual",
    }),
  );
}

export async function toggleShoppingItemFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.toggleShoppingItem(db, formNumber(formData, "id") ?? Number.NaN));
}

export async function deleteShoppingItemFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deleteShoppingItem(db, formNumber(formData, "id") ?? Number.NaN));
}

export async function clearCheckedShoppingItemsFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.clearCheckedShoppingItems(db));
}

/* -------------------------------- pantry ----------------------------------- */

export async function upsertPantryItemFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(() =>
    repo.upsertPantryItem(db, {
      ingredientId: formNumber(formData, "ingredientId") ?? Number.NaN,
      quantity: formNumber(formData, "quantity") ?? Number.NaN,
      unit: formString(formData, "unit"),
    }),
  );
}

export async function deletePantryItemFormAction(formData: FormData): Promise<void> {
  await submit(() => repo.deletePantryItem(db, formNumber(formData, "id") ?? Number.NaN));
}
