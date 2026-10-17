import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/db";
import { addRecipeToShoppingListFormAction } from "@/modules/kitchen/form-actions";
import * as repo from "@/modules/kitchen/db/repository";

export const instant = false;

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isInteger(recipeId)) notFound();

  let recipe;
  try {
    recipe = repo.getRecipe(db, recipeId);
  } catch {
    notFound();
  }

  const ris = repo.listRecipeIngredients(db, recipeId);
  const cookability = repo.listRecipesWithCookability(db).find((c) => c.recipe.id === recipeId);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <Link href="/kitchen/recipes" className="text-xs text-neutral-500 hover:text-neutral-300">← Recetas</Link>
        <h1 className="mt-2 text-xl font-semibold">{recipe.title}</h1>
        {recipe.description ? <p className="mt-1 text-sm text-neutral-500">{recipe.description}</p> : null}
        <p className="mt-1 text-xs text-neutral-500">{recipe.servings} porción(es)</p>
        {cookability?.cookable ? (
          <span className="mt-2 inline-block rounded bg-emerald-900/40 px-2 py-1 text-xs text-emerald-400">✓ Puedo cocinar</span>
        ) : (
          <span className="mt-2 inline-block rounded bg-amber-900/40 px-2 py-1 text-xs text-amber-400">
            Faltan: {cookability?.missing.join(", ")}
          </span>
        )}
      </header>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Ingredientes</h2>
        {ris.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin ingredientes.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {ris.map((ri) => (
              <li key={ri.id} className="text-sm">
                {ri.quantity / 100} {ri.unit ?? ri.ingredientUnit} — {ri.ingredientName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {recipe.instructions ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Instrucciones</h2>
          <p className="whitespace-pre-wrap text-sm text-neutral-300">{recipe.instructions}</p>
        </div>
      ) : null}

      <form action={addRecipeToShoppingListFormAction}>
        <input type="hidden" name="recipeId" value={recipe.id} />
        <button type="submit" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">
          Agregar ingredientes a lista de compras
        </button>
      </form>
    </section>
  );
}
