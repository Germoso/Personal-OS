"use client";

import { useActionState, useState } from "react";

import { createRecipeWithIngredientsFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

interface IngredientRow {
  ingredientId: string;
  quantity: string;
  unit: string;
}

export function RecipeForm({ ingredients }: { ingredients: { id: number; name: string; unit: string }[] }) {
  const [state, action] = useActionState(createRecipeWithIngredientsFormAction, INITIAL);
  const [rows, setRows] = useState<IngredientRow[]>([{ ingredientId: "", quantity: "1", unit: "" }]);

  function addRow() {
    setRows([...rows, { ingredientId: "", quantity: "1", unit: "" }]);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof IngredientRow, value: string) {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    // Auto-fill unit from ingredient
    if (field === "ingredientId") {
      const ing = ingredients.find((i) => i.id === Number(value));
      if (ing && !next[index].unit) {
        next[index].unit = ing.unit;
      }
    }
    setRows(next);
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-col gap-2">
        <input name="title" placeholder="Título de la receta…" required className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
        <textarea name="description" placeholder="Descripción (opcional)" rows={2} className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
        <input type="number" name="servings" placeholder="Porciones" defaultValue={1} className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm" />
        <textarea name="instructions" placeholder="Instrucciones (opcional)" rows={4} className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Ingredientes</h3>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              name="ingredientId"
              value={row.ingredientId}
              onChange={(e) => updateRow(i, "ingredientId", e.target.value)}
              required
              className="min-w-32 flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
            >
              <option value="">Ingrediente…</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
            <input
              type="number"
              name="quantity"
              value={row.quantity}
              onChange={(e) => updateRow(i, "quantity", e.target.value)}
              placeholder="Cant."
              step="0.01"
              required
              className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
            />
            <input
              name="unit"
              value={row.unit}
              onChange={(e) => updateRow(i, "unit", e.target.value)}
              placeholder="Unidad"
              className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
            />
            {rows.length > 1 ? (
              <button type="button" onClick={() => removeRow(i)} className="rounded border border-neutral-700 px-2 py-2 text-xs text-neutral-500 hover:text-red-400">
                ✕
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addRow} className="w-fit rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100">
          + Agregar ingrediente
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">
          Guardar receta
        </button>
        {state.ok ? <span className="text-sm text-emerald-400">Guardada</span> : state.error ? <span className="text-sm text-red-400">{state.error}</span> : null}
      </div>
    </form>
  );
}
