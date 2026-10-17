import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "@/db/columns";

export const SHOPPING_SOURCES = ["manual", "recipe"] as const;

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull().default("un"),
  category: text("category"),
  ...timestamps,
});

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  servings: integer("servings").notNull().default(1),
  instructions: text("instructions").notNull().default(""),
  ...timestamps,
});

export const recipeIngredients = sqliteTable(
  "recipe_ingredients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(), // scaled ×100
    unit: text("unit"), // override of ingredient unit
  },
  (table) => [
    index("recipe_ingredients_recipe_id_idx").on(table.recipeId),
    index("recipe_ingredients_ingredient_id_idx").on(table.ingredientId),
  ],
);

export const shoppingItems = sqliteTable(
  "shopping_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ingredientId: integer("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    freeText: text("free_text"),
    quantity: integer("quantity").notNull().default(100), // scaled ×100, default 1
    unit: text("unit").notNull().default("un"),
    checked: integer("checked", { mode: "boolean" }).notNull().default(false),
    source: text("source", { enum: SHOPPING_SOURCES }).notNull().default("manual"),
    ...timestamps,
  },
  (table) => [index("shopping_items_checked_idx").on(table.checked)],
);

export const pantryItems = sqliteTable("pantry_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .unique()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0), // scaled ×100
  unit: text("unit").notNull().default("un"),
  ...timestamps,
});
