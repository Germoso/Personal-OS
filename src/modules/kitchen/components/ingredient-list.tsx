import { toggleAvailableFormAction, deleteIngredientFormAction } from "../form-actions";
import type { Ingredient } from "../db/repository";

export function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  if (ingredients.length === 0) {
    return <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">No hay ingredientes.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {ingredients.map((ing) => (
        <li key={ing.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-3">
            <form action={toggleAvailableFormAction}>
              <input type="hidden" name="id" value={ing.id} />
              <button
                type="submit"
                className={`h-5 w-5 rounded border ${ing.available ? "bg-emerald-600 border-emerald-600" : "border-neutral-600"}`}
                aria-label="toggle available"
              >
                {ing.available ? "✓" : ""}
              </button>
            </form>
            <div>
              <p className={`text-sm font-medium ${ing.available ? "" : "text-neutral-500"}`}>{ing.name}</p>
              <p className="text-xs text-neutral-500">{ing.unit}{ing.category ? ` · ${ing.category}` : ""}</p>
            </div>
          </div>
          <form action={deleteIngredientFormAction} className="contents">
            <input type="hidden" name="id" value={ing.id} />
            <button type="submit" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400">Borrar</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
