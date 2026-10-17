import { and, eq, sql, type SQL } from "drizzle-orm";

import type { Db } from "@/db/client";

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";

export { NotFoundError, ValidationError };
export {
  SHOPPING_SOURCES,
  ingredients,
  pantryItems,
  recipeIngredients,
  recipes,
  shoppingItems,
} from "./schema";
import {
  SHOPPING_SOURCES,
  ingredients,
  pantryItems,
  recipeIngredients,
  recipes,
  shoppingItems,
} from "./schema";

export type Ingredient = typeof ingredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;

/* --------------------------------- helpers --------------------------------- */

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

function normalizeQty(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ValidationError(`Invalid ${field}: must be a positive number.`);
  }
  return Math.round(n * 100);
}

const nowIso = () => new Date().toISOString();

function requireIngredient(db: Db, id: number): Ingredient {
  const found = db.select().from(ingredients).where(eq(ingredients.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown ingredient id: ${id}.`);
  return found;
}

function requireRecipe(db: Db, id: number): Recipe {
  const found = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown recipe id: ${id}.`);
  return found;
}

/* -------------------------------- ingredients ------------------------------ */

export interface CreateIngredientInput {
  name: string;
  unit?: string;
  category?: string | null;
}

export function createIngredient(db: Db, input: CreateIngredientInput): Ingredient {
  return db
    .insert(ingredients)
    .values({
      name: requiredText(input.name, "name"),
      unit: input.unit === undefined ? undefined : requiredText(input.unit, "unit"),
      category: input.category === undefined ? undefined : (input.category === null ? null : optionalText(input.category, "category")),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export interface UpdateIngredientInput {
  id: number;
  name?: string;
  unit?: string;
  category?: string | null;
}

export function updateIngredient(db: Db, input: UpdateIngredientInput): Ingredient {
  requireIngredient(db, input.id);
  const patch: Partial<typeof ingredients.$inferInsert> = { updatedAt: nowIso() };
  if (input.name !== undefined) patch.name = requiredText(input.name, "name");
  if (input.unit !== undefined) patch.unit = requiredText(input.unit, "unit");
  if (input.category !== undefined)
    patch.category = input.category === null ? null : optionalText(input.category, "category");
  return db.update(ingredients).set(patch).where(eq(ingredients.id, input.id)).returning().get();
}

export function getIngredient(db: Db, id: number): Ingredient {
  return requireIngredient(db, id);
}

export function deleteIngredient(db: Db, id: number): void {
  requireIngredient(db, id);
  db.delete(ingredients).where(eq(ingredients.id, id)).run();
}

export function listIngredients(db: Db): Ingredient[] {
  return db.select().from(ingredients).orderBy(ingredients.name).all();
}

/* --------------------------------- recipes --------------------------------- */

export interface CreateRecipeInput {
  title: string;
  description?: string;
  servings?: number;
  instructions?: string;
}

export function createRecipe(db: Db, input: CreateRecipeInput): Recipe {
  const servings = input.servings === undefined ? 1 : normalizeServings(input.servings);
  return db
    .insert(recipes)
    .values({
      title: requiredText(input.title, "title"),
      description: optionalText(input.description, "description") ?? "",
      servings,
      instructions: optionalText(input.instructions, "instructions") ?? "",
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

function normalizeServings(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ValidationError("Servings must be a positive integer.");
  }
  return n;
}

export interface UpdateRecipeInput {
  id: number;
  title?: string;
  description?: string;
  servings?: number;
  instructions?: string;
}

export function updateRecipe(db: Db, input: UpdateRecipeInput): Recipe {
  requireRecipe(db, input.id);
  const patch: Partial<typeof recipes.$inferInsert> = { updatedAt: nowIso() };
  if (input.title !== undefined) patch.title = requiredText(input.title, "title");
  if (input.description !== undefined) patch.description = optionalText(input.description, "description") ?? "";
  if (input.servings !== undefined) patch.servings = normalizeServings(input.servings);
  if (input.instructions !== undefined) patch.instructions = optionalText(input.instructions, "instructions") ?? "";
  return db.update(recipes).set(patch).where(eq(recipes.id, input.id)).returning().get();
}

export function getRecipe(db: Db, id: number): Recipe {
  return requireRecipe(db, id);
}

export function deleteRecipe(db: Db, id: number): void {
  requireRecipe(db, id);
  db.delete(recipes).where(eq(recipes.id, id)).run();
}

export function listRecipes(db: Db): Recipe[] {
  return db.select().from(recipes).orderBy(recipes.title).all();
}

/* --------------------------- recipe ingredients ----------------------------- */

export interface AddRecipeIngredientInput {
  recipeId: number;
  ingredientId: number;
  quantity: number; // human number, scaled ×100 internally
  unit?: string | null;
}

export function addRecipeIngredient(db: Db, input: AddRecipeIngredientInput): RecipeIngredient {
  requireRecipe(db, input.recipeId);
  requireIngredient(db, input.ingredientId);
  return db
    .insert(recipeIngredients)
    .values({
      recipeId: input.recipeId,
      ingredientId: input.ingredientId,
      quantity: normalizeQty(input.quantity, "quantity"),
      unit: input.unit === undefined ? null : (input.unit === null ? null : optionalText(input.unit, "unit")),
    })
    .returning()
    .get();
}

export function removeRecipeIngredient(db: Db, id: number): void {
  const found = db.select().from(recipeIngredients).where(eq(recipeIngredients.id, id)).get();
  if (!found) throw new NotFoundError(`Unknown recipe ingredient id: ${id}.`);
  db.delete(recipeIngredients).where(eq(recipeIngredients.id, id)).run();
}

export function listRecipeIngredients(db: Db, recipeId: number): (RecipeIngredient & { ingredientName: string; ingredientUnit: string })[] {
  const rows = db
    .select({
      id: recipeIngredients.id,
      recipeId: recipeIngredients.recipeId,
      ingredientId: recipeIngredients.ingredientId,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      ingredientName: ingredients.name,
      ingredientUnit: ingredients.unit,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .all();
  return rows;
}

/* ----------------------------- shopping list ------------------------------- */

export interface AddShoppingItemInput {
  ingredientId?: number | null;
  freeText?: string;
  quantity?: number;
  unit?: string;
  source?: (typeof SHOPPING_SOURCES)[number];
}

export function addShoppingItem(db: Db, input: AddShoppingItemInput): ShoppingItem {
  const ingredient = input.ingredientId != null ? requireIngredient(db, input.ingredientId) : null;
  const freeText = input.ingredientId == null ? requiredText(input.freeText ?? "", "item") : undefined;
  return db
    .insert(shoppingItems)
    .values({
      ingredientId: input.ingredientId ?? null,
      freeText,
      quantity: input.quantity === undefined ? 100 : normalizeQty(input.quantity, "quantity"),
      unit: input.unit ?? ingredient?.unit ?? "un",
      source: input.source === undefined ? "manual" : input.source,
    })
    .returning()
    .get();
}

export function toggleShoppingItem(db: Db, id: number): ShoppingItem {
  const item = db.select().from(shoppingItems).where(eq(shoppingItems.id, id)).get();
  if (!item) throw new NotFoundError(`Unknown shopping item id: ${id}.`);
  const newChecked = !item.checked;

  // Sync with pantry: buying an item makes it available at home; un-buying
  // removes it from the pantry so recipes no longer consider it available.
  if (item.ingredientId != null) {
    if (newChecked) {
      upsertPantryItem(db, {
        ingredientId: item.ingredientId,
        quantity: item.quantity / 100,
        unit: item.unit,
      });
    } else {
      const pantryItem = db
        .select()
        .from(pantryItems)
        .where(eq(pantryItems.ingredientId, item.ingredientId))
        .get();
      if (pantryItem) deletePantryItem(db, pantryItem.id);
    }
  }

  return db
    .update(shoppingItems)
    .set({ checked: newChecked, updatedAt: nowIso() })
    .where(eq(shoppingItems.id, id))
    .returning()
    .get();
}

export function deleteShoppingItem(db: Db, id: number): void {
  const item = db.select().from(shoppingItems).where(eq(shoppingItems.id, id)).get();
  if (!item) throw new NotFoundError(`Unknown shopping item id: ${id}.`);
  db.delete(shoppingItems).where(eq(shoppingItems.id, id)).run();
}

export function clearCheckedShoppingItems(db: Db): void {
  db.delete(shoppingItems).where(eq(shoppingItems.checked, true)).run();
}

export function listShoppingItems(db: Db, checked?: boolean): ShoppingItem[] {
  return db
    .select()
    .from(shoppingItems)
    .where(checked === undefined ? undefined : eq(shoppingItems.checked, checked))
    .orderBy(shoppingItems.checked, shoppingItems.createdAt)
    .all();
}

/**
 * Adds a recipe's ingredients to the shopping list, summing quantities when
 * the same ingredient already exists as an unchecked item.
 */
export function addRecipeToShoppingList(db: Db, recipeId: number): ShoppingItem[] {
  requireRecipe(db, recipeId);
  const ris = listRecipeIngredients(db, recipeId);
  const result: ShoppingItem[] = [];
  for (const ri of ris) {
    const existing = db
      .select()
      .from(shoppingItems)
      .where(and(eq(shoppingItems.ingredientId, ri.ingredientId), eq(shoppingItems.checked, false)))
      .get();
    if (existing) {
      const updated = db
        .update(shoppingItems)
        .set({ quantity: existing.quantity + ri.quantity, updatedAt: nowIso() })
        .where(eq(shoppingItems.id, existing.id))
        .returning()
        .get();
      result.push(updated);
    } else {
      const item = addShoppingItem(db, {
        ingredientId: ri.ingredientId,
        quantity: ri.quantity / 100,
        unit: ri.unit ?? ri.ingredientUnit,
        source: "recipe",
      });
      result.push(item);
    }
  }
  return result;
}

/* --------------------------------- pantry ---------------------------------- */

export interface UpsertPantryItemInput {
  ingredientId: number;
  quantity: number;
  unit?: string;
}

export function upsertPantryItem(db: Db, input: UpsertPantryItemInput): PantryItem {
  requireIngredient(db, input.ingredientId);
  const existing = db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.ingredientId, input.ingredientId))
    .get();
  const qty = normalizeQty(input.quantity, "quantity");
  if (existing) {
    return db
      .update(pantryItems)
      .set({ quantity: qty, unit: input.unit ?? existing.unit, updatedAt: nowIso() })
      .where(eq(pantryItems.id, existing.id))
      .returning()
      .get();
  }
  return db
    .insert(pantryItems)
    .values({
      ingredientId: input.ingredientId,
      quantity: qty,
      unit: input.unit ?? "un",
      updatedAt: nowIso(),
    })
    .returning()
    .get();
}

export function deletePantryItem(db: Db, id: number): void {
  const item = db.select().from(pantryItems).where(eq(pantryItems.id, id)).get();
  if (!item) throw new NotFoundError(`Unknown pantry item id: ${id}.`);
  db.delete(pantryItems).where(eq(pantryItems.id, id)).run();
}

export function listPantryItems(db: Db): (PantryItem & { ingredientName: string; ingredientUnit: string })[] {
  return db
    .select({
      id: pantryItems.id,
      ingredientId: pantryItems.ingredientId,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      createdAt: pantryItems.createdAt,
      updatedAt: pantryItems.updatedAt,
      ingredientName: ingredients.name,
      ingredientUnit: ingredients.unit,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .orderBy(ingredients.name)
    .all();
}

/* ----------------------------- cookability --------------------------------- */

export interface RecipeCookability {
  recipe: Recipe;
  cookable: boolean;
  missing: string[]; // ingredient names
}

/**
 * Returns all recipes with their cookability status based on the pantry.
 * A recipe is cookable when every recipe ingredient has a pantry item with
 * quantity >= the recipe's required quantity.
 */
export function listRecipesWithCookability(db: Db): RecipeCookability[] {
  const allRecipes = listRecipes(db);
  const pantry = listPantryItems(db);
  const pantryMap = new Map(pantry.map((p) => [p.ingredientId, p.quantity]));

  return allRecipes.map((recipe) => {
    const ris = listRecipeIngredients(db, recipe.id);
    const missing: string[] = [];
    for (const ri of ris) {
      const available = pantryMap.get(ri.ingredientId) ?? 0;
      if (available < ri.quantity) {
        missing.push(ri.ingredientName);
      }
    }
    return { recipe, cookable: missing.length === 0, missing };
  });
}
