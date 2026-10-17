import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "@/db/columns";

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull().default("un"),
  category: text("category"),
  available: integer("available", { mode: "boolean" }).notNull().default(false),
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
