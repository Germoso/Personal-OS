"use client";

import { useActionState } from "react";

import { addRecipeIngredientFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function RecipeIngredientForm({
  recipeId,
  ingredients,
}: {
  recipeId: number;
  ingredients: { id: number; name: string }[];
}) {
  const [state, action] = useActionState(addRecipeIngredientFormAction, INITIAL);

  return (
    <form action={action} className="flex flex-wrap gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <input type="hidden" name="recipeId" value={recipeId} />
      <select name="ingredientId" required className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm">
        <option value="">Ingrediente…</option>
        {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
      </select>
      <input type="number" name="quantity" placeholder="Cant." defaultValue={1} required className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm" />
      <input name="unit" placeholder="Unidad (opcional)" className="w-32 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm" />
      <button type="submit" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">Añadir</button>
      {state.ok ? <span className="text-sm text-emerald-400">Guardado</span> : state.error ? <span className="text-sm text-red-400">{state.error}</span> : null}
    </form>
  );
}
