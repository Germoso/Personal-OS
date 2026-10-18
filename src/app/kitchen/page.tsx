import { connection } from "next/server";

import { db } from "@/db";
import * as repo from "@/modules/kitchen/db/repository";

export const instant = false;

export default async function KitchenPage() {
  await connection();

  const ingredients = repo.listIngredients(db);
  const recipes = repo.listRecipes(db);
  const cookability = repo.listRecipesWithCookability(db);
  const cookableCount = cookability.filter((c) => c.cookable).length;
  const availableCount = ingredients.filter((i) => i.available).length;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-normal">Cocina</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {ingredients.length} ingredientes ({availableCount} disponibles) · {recipes.length} recetas · {cookableCount} cocinables ahora
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <a href="/kitchen/ingredients" className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600">
          <h2 className="text-sm font-semibold">Ingredientes</h2>
          <p className="mt-1 text-2xl font-bold">{ingredients.length}</p>
          <p className="text-xs text-neutral-500">{availableCount} disponibles</p>
        </a>
        <a href="/kitchen/recipes" className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600">
          <h2 className="text-sm font-semibold">Recetas</h2>
          <p className="mt-1 text-2xl font-bold">{recipes.length}</p>
          <p className="text-xs text-neutral-500">{cookableCount} cocinables</p>
        </a>
      </div>

      {cookableCount > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Recetas que puedo cocinar ahora</h2>
          <ul className="flex flex-col gap-2">
            {cookability.filter((c) => c.cookable).map((c) => (
              <li key={c.recipe.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <a href={`/kitchen/recipes/${c.recipe.id}`} className="text-sm font-medium hover:text-neutral-300">{c.recipe.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2 text-sm">
        <a href="/kitchen/ingredients" className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100">Ingredientes</a>
        <a href="/kitchen/recipes" className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100">Recetas</a>
      </nav>
    </section>
  );
}
