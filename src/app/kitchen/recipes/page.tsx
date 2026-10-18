import { connection } from "next/server";

import { db } from "@/db";
import { RecipeForm } from "@/modules/kitchen/components/recipe-form";
import { RecipeList } from "@/modules/kitchen/components/recipe-list";
import * as repo from "@/modules/kitchen/db/repository";

export const instant = false;

export default async function KitchenRecipesPage() {
  await connection();
  const recipes = repo.listRecipes(db);
  const cookability = repo.listRecipesWithCookability(db);
  const cookableIds = new Set(cookability.filter((c) => c.cookable).map((c) => c.recipe.id));
  const ingredients = repo.listIngredients(db);

  return (
    <section className="flex flex-col gap-6">
      <header><h1 className="text-3xl font-normal">Recetas</h1><p className="mt-1 text-sm text-neutral-500">{recipes.length} recetas · {cookableIds.size} cocinables ahora</p></header>
      <RecipeForm ingredients={ingredients} />
      <RecipeList recipes={recipes} />
      {recipes.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Disponibilidad</h2>
          <ul className="flex flex-col gap-2">
            {cookability.map((c) => (
              <li key={c.recipe.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm">
                <span className="font-medium">{c.recipe.title}</span>
                {c.cookable ? (
                  <span className="ml-2 text-emerald-400">✓ Puedo cocinar</span>
                ) : (
                  <span className="ml-2 text-amber-400">Faltan: {c.missing.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
