"use client";

import { useActionState } from "react";

import { addShoppingItemFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function ShoppingAddForm({ ingredients }: { ingredients: { id: number; name: string }[] }) {
  const [state, action] = useActionState(addShoppingItemFormAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap gap-2">
        <select name="ingredientId" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm">
          <option value="">Ingrediente (o texto libre)…</option>
          {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
        </select>
        <input name="freeText" placeholder="Texto libre" className="min-w-32 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
        <input type="number" name="quantity" placeholder="Cant." defaultValue={1} className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm" />
        <input name="unit" placeholder="Unidad" defaultValue="un" className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">Añadir</button>
        {state.ok ? <span className="text-sm text-emerald-400">Guardado</span> : state.error ? <span className="text-sm text-red-400">{state.error}</span> : null}
      </div>
    </form>
  );
}
