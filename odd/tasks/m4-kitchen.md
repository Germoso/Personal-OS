# Feature: M4 — Kitchen (recipes + shopping list)

Personal OS, milestone 4: a kitchen module. Ingredients, recipes with their
ingredient lists, a shopping list, and a pantry (what's available at home).
Recipes can be matched against available pantry ingredients to show which ones
can be cooked right now.

Branch: `feat/m4-kitchen` (stacked on `feat/m3-finance`, M3 is not merged yet).

## Specs

S20 — Scope (approved): "un modulo para la cocina, integrar una lista de compras con una lista de recetas en base a esos ingredientes". User confirmation: "Si, tambien quiero ver las recetas disponibles segun los ingredientes que hay".

S21 — Ingredient entity: name (required, unique), unit (default "un"), category (optional, free text). Ingredients are the shared vocabulary between recipes, shopping list and pantry.

S22 — Recipe entity: title (required), description (optional), servings (positive integer, default 1), instructions (optional free text). A recipe has 0..N recipe ingredients.

S23 — RecipeIngredient entity: recipeId (FK, cascade delete), ingredientId (FK, restrict delete if used), quantity (positive number, stored as integer scaled ×100 to allow decimals like 0.5), unit (override of ingredient unit, optional).

S24 — ShoppingItem entity: ingredientId (FK, nullable for free-text items), freeText (optional, used when ingredientId is null), quantity (integer scaled ×100), unit, checked (boolean, default false), source (manual or recipe). Items can be toggled checked/unchecked.

S25 — PantryItem entity: ingredientId (FK, unique), quantity (integer scaled ×100), unit. Represents what the user has at home. Upsert by ingredient.

S26 — "Available recipes" (from S20): a recipe is cookable when every one of its recipe ingredients has a matching pantry item with sufficient quantity. The UI shows cookable recipes first, then recipes missing 1..N ingredients with the list of missing ingredient names.

S27 — "Generate shopping list from recipe": a button on a recipe adds its ingredients to the shopping list, summing quantities when the same ingredient already exists as an unchecked item.

S28 — Views: `/kitchen` summary (pantry count, shopping pending count, cookable recipes). `/kitchen/ingredients` CRUD. `/kitchen/recipes` list + create. `/kitchen/recipes/[id]` detail with ingredients, instructions, "add to shopping list" button, cookability badge. `/kitchen/shopping` checklist with toggle. `/kitchen/pantry` CRUD for pantry items.

S29 — Verification: tests for all schemas, repositories (validation, CRUD, queries, cookability, shopping generation), server actions, FormData form actions, and HTTP smoke.

Non-goals (not requested): meal planning, nutrition/calories, external recipe import, photos, favorites, sharing, barcode scanning.

## Tasks

- K1 (S20, S29) — Feature document, branch and tracking. Route: inline. Commit: (this document)
- K2 (S21) — Ingredients schema + migration + model tests. Route: inline. Commit: (schema commit)
- K3 (S22, S23) — Recipes + recipe ingredients schema + migration + model tests. Route: inline. Commit: (schema commit)
- K4 (S24) — Shopping items schema + migration + model tests. Route: inline. Commit: (schema commit)
- K5 (S25) — Pantry items schema + migration + model tests. Route: inline. Commit: (schema commit)
- K6 (S21) — Ingredient repository + tests. Route: inline. Commit: (repository commit)
- K7 (S22, S23) — Recipe repository (CRUD, ingredients) + tests. Route: inline. Commit: (repository commit)
- K8 (S24) — Shopping repository (CRUD, toggle, generate from recipe) + tests. Route: inline. Commit: (repository commit)
- K9 (S25, S26) — Pantry repository + cookability query + tests. Route: inline. Commit: (repository commit)
- K10 (S28) — Server actions + FormData form actions + tests. Route: inline. Commit: (form-actions commit)
- K11 (S28) — Kitchen views (summary, ingredients, recipes, recipe detail, shopping, pantry) + navigation. Route: inline. Commit: (views commit)
- K12 (S29) — README update + final verification. Route: inline. Commit: af21263

## Log

L30 — User request (verbatim): "BIEN, AHORA HAZ UN MODULO QUE SEA PARA LA COCINA PORQUE QUIERO INTEGRAR UNA LISTA DE COMPRAS CON UNA LISTA DE RECETAS EN BASE A ESOS INGREDIENTES".
L31 — User addition (verbatim): "Si, tambien quiero ver las recetas disponibles segun los ingredientes que hay".
L32 — Plan decision: M4 is a new domain module (`src/modules/kitchen`) with its own Drizzle schema file, reusing shared SQLite client, validation/error-mapping conventions, `instant = false` rendering strategy, and the timestamps column helper.
L33 — Entity decision (architect, from S20/S21): five entities (ingredients, recipes, recipe_ingredients, shopping_items, pantry_items). Quantities stored as integer scaled ×100 to support decimals (0.5 kg). Balance/cookability is derived, never stored.
