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
  it("creates and lists ingredients", () => {
    const ing = repo.createIngredient(db, { name: "Harina", unit: "g", category: "secos" });
    expect(ing).toMatchObject({ name: "Harina", unit: "g", category: "secos" });
    expect(repo.listIngredients(db)).toHaveLength(1);
  });

  it("rejects blank name", () => {
    expect(() => repo.createIngredient(db, { name: "   " })).toThrow(/name/i);
  });

  it("updates and deletes", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    repo.updateIngredient(db, { id: ing.id, unit: "kg" });
    expect(repo.getIngredient(db, ing.id).unit).toBe("kg");
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
    expect(ri.quantity).toBe(200); // scaled ×100
    expect(repo.listRecipeIngredients(db, recipe.id)).toHaveLength(1);
    repo.removeRecipeIngredient(db, ri.id);
    expect(repo.listRecipeIngredients(db, recipe.id)).toHaveLength(0);
  });
});

describe("shopping list (S24)", () => {
  it("adds and toggles items", () => {
    const item = repo.addShoppingItem(db, { freeText: "Leche", quantity: 2, unit: "l" });
    expect(item).toMatchObject({ freeText: "Leche", checked: false });
    const toggled = repo.toggleShoppingItem(db, item.id);
    expect(toggled.checked).toBe(true);
  });

  it("generates shopping list from recipe", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    const items = repo.addRecipeToShoppingList(db, recipe.id);
    expect(items).toHaveLength(1);
    expect(repo.listShoppingItems(db)).toHaveLength(1);
  });

  it("sums quantities for duplicate unchecked items", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    repo.addRecipeToShoppingList(db, recipe.id);
    repo.addRecipeToShoppingList(db, recipe.id);
    const items = repo.listShoppingItems(db);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(200); // 1 + 1 = 2 (scaled ×100)
  });

  it("clears checked items", () => {
    const item = repo.addShoppingItem(db, { freeText: "Leche" });
    repo.toggleShoppingItem(db, item.id);
    repo.clearCheckedShoppingItems(db);
    expect(repo.listShoppingItems(db)).toEqual([]);
  });
});

describe("pantry (S25)", () => {
  it("upserts pantry items", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const item = repo.upsertPantryItem(db, { ingredientId: ing.id, quantity: 2, unit: "kg" });
    expect(item.quantity).toBe(200);
    const updated = repo.upsertPantryItem(db, { ingredientId: ing.id, quantity: 3 });
    expect(updated.quantity).toBe(300);
    expect(repo.listPantryItems(db)).toHaveLength(1);
  });

  it("deletes pantry items", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const item = repo.upsertPantryItem(db, { ingredientId: ing.id, quantity: 1 });
    repo.deletePantryItem(db, item.id);
    expect(repo.listPantryItems(db)).toEqual([]);
  });
});

describe("cookability (S26)", () => {
  it("marks recipe as cookable when all ingredients available", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    repo.upsertPantryItem(db, { ingredientId: ing.id, quantity: 2 });
    const result = repo.listRecipesWithCookability(db);
    expect(result[0].cookable).toBe(true);
    expect(result[0].missing).toEqual([]);
  });

  it("marks recipe as not cookable when ingredient missing", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 1 });
    const result = repo.listRecipesWithCookability(db);
    expect(result[0].cookable).toBe(false);
    expect(result[0].missing).toEqual(["Harina"]);
  });

  it("marks recipe as not cookable when insufficient quantity", () => {
    const ing = repo.createIngredient(db, { name: "Harina" });
    const recipe = repo.createRecipe(db, { title: "Panqueques" });
    repo.addRecipeIngredient(db, { recipeId: recipe.id, ingredientId: ing.id, quantity: 2 });
    repo.upsertPantryItem(db, { ingredientId: ing.id, quantity: 1 });
    const result = repo.listRecipesWithCookability(db);
    expect(result[0].cookable).toBe(false);
    expect(result[0].missing).toEqual(["Harina"]);
  });
});
