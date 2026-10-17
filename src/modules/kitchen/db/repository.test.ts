import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@/db/client";

import * as repo from "./repository";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("ingredients (S21)", () => {
  it("creates and lists ingredients with available=false by default", () => {
    const ing = repo.createIngredient(db, { name: "Harina", unit: "g", category: "secos" });
    expect(ing).toMatchObject({ name: "Harina", unit: "g", category: "secos", available: false });
    expect(repo.listIngredients(db)).toHaveLength(1);
  });

  it("creates an ingredient as available", () => {
    const ing = repo.createIngredient(db, { name: "Huevos", available: true });
    expect(ing.available).toBe(true);
  });

  it("rejects blank name", () => {
    expect(() => repo.createIngredient(db, { name: "   " })).toThrow(/name/i);
  });

  it("toggles available", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    expect(ing.available).toBe(false);
    const toggled = repo.toggleAvailable(db, ing.id);
    expect(toggled.available).toBe(true);
    const toggledBack = repo.toggleAvailable(db, ing.id);
    expect(toggledBack.available).toBe(false);
  });

  it("updates and deletes", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    repo.updateIngredient(db, { id: ing.id, unit: "kg", available: true });
    expect(repo.getIngredient(db, ing.id).unit).toBe("kg");
    expect(repo.getIngredient(db, ing.id).available).toBe(true);
    repo.deleteIngredient(db, ing.id);
    expect(repo.listIngredients(db)).toEqual([]);
  });
});

describe("recipes (S22)", () => {
  it("creates a recipe", () => {
    const recipe = repo.createRecipe(db, { title: "Panqueques", servings: 4, description: "Ricos" });
    expect(recipe).toMatchObject({ title: "Panqueques", servings: 4, description: "Ricos" });
  });

  it("rejects blank title", () => {
    expect(() => repo.createRecipe(db, { title: "   " })).toThrow(/title/i);
  });

  it("adds and removes recipe ingredients", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    const ri = repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 2, unit: "tazas" });
    expect(ri.quantity).toBe(200);
    expect(repo.listRecipeIngredients(db, recipe.id)).toHaveLength(1);
    repo.removeRecipeIngredient(db, ri.id);
    expect(repo.listRecipeIngredients(db, recipe.id)).toHaveLength(0);
  });

  it("updates recipe ingredient quantity and unit", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    const ri = repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    const updated = repo.updateRecipeIngredient(db, { id: ri.id, quantity: 3, unit: "kg" });
    expect(updated.quantity).toBe(300);
    expect(updated.unit).toBe("kg");
  });

  it("updates recipe ingredient ingredient", () => {
    const ing1 = repo.createIngredient(db, { name: "Harina" });
    const ing2 = repo.createIngredient(db, { name: "Avena" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    const ri = repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing1.id, quantity: 1 });
    const updated = repo.updateRecipeIngredient(db, { id: ri.id, ingredientId: ing2.id });
    expect(updated.ingredientId).toBe(ing2.id);
  });
});

describe("cookability (S26)", () => {
  it("marks recipe as cookable when all ingredients available", () => {
    const ing = repo.createIngredient(db, { name: "Harina", available: true });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    const result = repo.listRecipesWithCookability(db);
    expect(result[0].cookable).toBe(true);
    expect(result[0].missing).toEqual([]);
  });

  it("marks recipe as not cookable when ingredient not available", () => {
    const ing = repo.createIngredient(db, { name: "Harina", available: false });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    const result = repo.listRecipesWithCookability(db);
    expect(result[0].cookable).toBe(false);
    expect(result[0].missing).toEqual(["Harina"]);
  });

  it("marks recipe as cookable when no ingredients", () => {
    const recipe = repo.createRecipe(db, { title: "Agua" });
    const result = repo.listRecipesWithCookability(db);
    expect(result[0].cookable).toBe(true);
  });
});
