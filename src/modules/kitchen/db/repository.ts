import { and, eq, sql, type SQL } from "drizzle-orm";

import type { Db } from "@/db/client";

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";

export { NotFoundError, ValidationError };
export { ingredients, recipeIngredients, recipes } from "./schema";
import { ingredients, recipeIngredients, recipes } from "./schema";

export type Ingredient = typeof ingredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

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

function normalizeServings(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ValidationError("Servings must be a positive integer.");
  }
  return n;
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
  available?: boolean;
}

export function createIngredient(db: Db, input: CreateIngredientInput): Ingredient {
  return db
    .insert(ingredients)
    .values({
      name: requiredText(input.name, "name"),
      unit: input.unit === undefined ? undefined : requiredText(input.unit, "unit"),
      category: input.category === undefined ? undefined : (input.category === null ? null : optionalText(input.category, "category")),
      available: input.available ?? false,
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
  available?: boolean;
}

export function updateIngredient(db: Db, input: UpdateIngredientInput): Ingredient {
  requireIngredient(db, input.id);
  const patch: Partial<typeof ingredients.$inferInsert> = { updatedAt: nowIso() };
  if (input.name !== undefined) patch.name = requiredText(input.name, "name");
  if (input.unit !== undefined) patch.unit = requiredText(input.unit, "unit");
  if (input.category !== undefined)
    patch.category = input.category === null ? null : optionalText(input.category, "category");
  if (input.available !== undefined) patch.available = input.available;
  return db.update(ingredients).set(patch).where(eq(ingredients.id, input.id)).returning().get();
}

export function toggleAvailable(db: Db, id: number): Ingredient {
  const ing = requireIngredient(db, id);
  return updateIngredient(db, { id, available: !ing.available });
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
  quantity: number;
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

export interface UpdateRecipeIngredientInput {
  id: number;
  ingredientId?: number;
  quantity?: number;
  unit?: string | null;
}

export function updateRecipeIngredient(db: Db, input: UpdateRecipeIngredientInput): RecipeIngredient {
  const found = db.select().from(recipeIngredients).where(eq(recipeIngredients.id, input.id)).get();
  if (!found) throw new NotFoundError(`Unknown recipe ingredient id: ${input.id}.`);
  const patch: Partial<typeof recipeIngredients.$inferInsert> = {};
  if (input.ingredientId !== undefined) {
    requireIngredient(db, input.ingredientId);
    patch.ingredientId = input.ingredientId;
  }
  if (input.quantity !== undefined) patch.quantity = normalizeQty(input.quantity, "quantity");
  if (input.unit !== undefined) patch.unit = input.unit === null ? null : optionalText(input.unit, "unit");
  return db.update(recipeIngredients).set(patch).where(eq(recipeIngredients.id, input.id)).returning().get();
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

/* ----------------------------- cookability --------------------------------- */

export interface RecipeCookability {
  recipe: Recipe;
  cookable: boolean;
  missing: string[];
}

export function listRecipesWithCookability(db: Db): RecipeCookability[] {
  const allRecipes = listRecipes(db);
  const allIngredients = listIngredients(db);
  const availableMap = new Map(allIngredients.map((i) => [i.id, i.available]));

  return allRecipes.map((recipe) => {
    const ris = listRecipeIngredients(db, recipe.id);
    const missing: string[] = [];
    for (const ri of ris) {
      if (!availableMap.get(ri.ingredientId)) {
        missing.push(ri.ingredientName);
      }
    }
    return { recipe, cookable: missing.length === 0, missing };
  });
}
