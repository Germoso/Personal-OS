import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/db";
import { removeRecipeIngredientFormAction } from "@/modules/kitchen/form-actions";
import { RecipeIngredientEdit } from "@/modules/kitchen/components/recipe-ingredient-edit";
import { RecipeIngredientForm } from "@/modules/kitchen/components/recipe-ingredient-form";
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
  const ingredients = repo.listIngredients(db);

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

      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
        <h2 className="mb-2 text-sm font-semibold">Agregar ingrediente a esta receta</h2>
        <RecipeIngredientForm recipeId={recipe.id} ingredients={ingredients} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Ingredientes de la receta</h2>
        {ris.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin ingredientes. Agregá uno arriba.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ris.map((ri) => (
              <li key={ri.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <span className="text-sm">{ri.quantity / 100} {ri.unit ?? ri.ingredientUnit} — {ri.ingredientName}</span>
                <div className="flex gap-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200">Editar</summary>
                    <div className="mt-2">
                      <RecipeIngredientEdit id={ri.id} quantity={ri.quantity / 100} unit={ri.unit} />
                    </div>
                  </details>
                  <form action={removeRecipeIngredientFormAction}>
                    <input type="hidden" name="id" value={ri.id} />
                    <button type="submit" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400">Borrar</button>
                  </form>
                </div>
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
    </section>
  );
}
