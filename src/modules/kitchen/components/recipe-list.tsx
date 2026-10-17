import Link from "next/link";
import { deleteRecipeFormAction } from "../form-actions";
import type { Recipe } from "../db/repository";

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  if (recipes.length === 0) {
    return <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">No hay recetas.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div>
            <Link href={`/kitchen/recipes/${recipe.id}`} className="text-sm font-medium hover:text-neutral-300">{recipe.title}</Link>
            <p className="text-xs text-neutral-500">{recipe.servings} porción(es){recipe.description ? ` · ${recipe.description}` : ""}</p>
          </div>
          <form action={deleteRecipeFormAction} className="contents">
            <input type="hidden" name="id" value={recipe.id} />
            <button type="submit" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400">Borrar</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
