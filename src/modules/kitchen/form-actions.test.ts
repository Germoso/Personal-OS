import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/db", async () => {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { createDb } = await import("@/db/client");
  const db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db };
});

import { db } from "@/db";

import * as repo from "./db/repository";
import {
  createIngredientFormAction,
  createRecipeFormAction,
  deleteIngredientFormAction,
  toggleShoppingItemFormAction,
} from "./form-actions";

function fd(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

beforeEach(() => {
  revalidatePath.mockClear();
  for (const item of repo.listShoppingItems(db)) repo.deleteShoppingItem(db, item.id);
  for (const item of repo.listPantryItems(db)) repo.deletePantryItem(db, item.id);
  for (const recipe of repo.listRecipes(db)) repo.deleteRecipe(db, recipe.id);
  for (const ing of repo.listIngredients(db)) repo.deleteIngredient(db, ing.id);
});

describe("createIngredientFormAction", () => {
  it("creates an ingredient and revalidates", async () => {
    const state = await createIngredientFormAction({ ok: false }, fd({ name: "Harina", unit: "g" }));
    expect(state).toEqual({ ok: true });
    expect(repo.listIngredients(db)).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns validation message", async () => {
    const state = await createIngredientFormAction({ ok: false }, fd({ name: "   " }));
    expect(state.ok).toBe(false);
    expect(state.error).toMatch(/name/i);
  });
});

describe("createRecipeFormAction", () => {
  it("creates a recipe and revalidates", async () => {
    const state = await createRecipeFormAction({ ok: false }, fd({ title: "Panqueques", servings: "4" }));
    expect(state).toEqual({ ok: true });
    expect(repo.listRecipes(db)).toHaveLength(1);
  });
});

describe("deleteIngredientFormAction", () => {
  it("deletes and revalidates", async () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    await deleteIngredientFormAction(fd({ id: String(ing.id) }));
    expect(repo.listIngredients(db)).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("toggleShoppingItemFormAction", () => {
  it("toggles and revalidates", async () => {
    const item = repo.addShoppingItem(db, { freeText: "Leche" });
    await toggleShoppingItemFormAction(fd({ id: String(item.id) }));
    expect(repo.listShoppingItems(db)[0].checked).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
