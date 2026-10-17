"use client";

import { useActionState } from "react";

import { updateRecipeIngredientFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function RecipeIngredientEdit({
  id,
  quantity,
  unit,
}: {
  id: number;
  quantity: number;
  unit: string | null;
}) {
  const [state, action] = useActionState(updateRecipeIngredientFormAction, INITIAL);

  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="number" name="quantity" defaultValue={quantity} className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs" />
      <input name="unit" defaultValue={unit ?? ""} placeholder="unidad" className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs" />
      <button type="submit" className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-900">Guardar</button>
      {state.ok ? <span className="text-xs text-emerald-400">✓</span> : state.error ? <span className="text-xs text-red-400">{state.error}</span> : null}
    </form>
  );
}
