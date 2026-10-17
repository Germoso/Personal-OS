import { connection } from "next/server";

import { db } from "@/db";
import {
  clearCheckedShoppingItemsFormAction,
  deleteShoppingItemFormAction,
  toggleShoppingItemFormAction,
} from "@/modules/kitchen/form-actions";
import { ShoppingAddForm } from "@/modules/kitchen/components/shopping-add-form";
import * as repo from "@/modules/kitchen/db/repository";

export const instant = false;

export default async function KitchenShoppingPage() {
  await connection();
  const items = repo.listShoppingItems(db);
  const ingredients = repo.listIngredients(db);
  const ingMap = new Map(ingredients.map((i) => [i.id, i.name]));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Lista de compras</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {items.filter((i) => !i.checked).length} pendientes · {items.filter((i) => i.checked).length} comprados
        </p>
      </header>

      <ShoppingAddForm ingredients={ingredients} />

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className={`flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4 ${item.checked ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <form action={toggleShoppingItemFormAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className={`h-5 w-5 rounded border ${item.checked ? "bg-emerald-600 border-emerald-600" : "border-neutral-600"}`} aria-label="toggle">
                  {item.checked ? "✓" : ""}
                </button>
              </form>
              <div>
                <p className={`text-sm ${item.checked ? "line-through" : ""}`}>
                  {item.ingredientId ? ingMap.get(item.ingredientId) : item.freeText}
                </p>
                <p className="text-xs text-neutral-500">{item.quantity / 100} {item.unit} · {item.source}</p>
              </div>
            </div>
            <form action={deleteShoppingItemFormAction}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400">Borrar</button>
            </form>
          </li>
        ))}
      </ul>

      {items.some((i) => i.checked) ? (
        <form action={clearCheckedShoppingItemsFormAction}>
          <button type="submit" className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100">
            Limpiar comprados
          </button>
        </form>
      ) : null}
    </section>
  );
}
