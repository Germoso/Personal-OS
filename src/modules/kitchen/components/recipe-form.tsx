"use client";

import { useActionState } from "react";

import { createRecipeFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function RecipeForm() {
  const [state, action] = useActionState(createRecipeFormAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <input name="title" placeholder="Título de la receta…" required className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
      <textarea name="description" placeholder="Descripción (opcional)" rows={2} className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
      <div className="flex flex-wrap gap-2">
        <input type="number" name="servings" placeholder="Porciones" defaultValue={1} className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm" />
      </div>
      <textarea name="instructions" placeholder="Instrucciones (opcional)" rows={4} className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        <button type="submit" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">Añadir receta</button>
        {state.ok ? <span className="text-sm text-emerald-400">Guardada</span> : state.error ? <span className="text-sm text-red-400">{state.error}</span> : null}
      </div>
    </form>
  );
}
