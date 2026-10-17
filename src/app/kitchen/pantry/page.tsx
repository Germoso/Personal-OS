import { connection } from "next/server";

import { db } from "@/db";
import { deletePantryItemFormAction } from "@/modules/kitchen/form-actions";
import { PantryForm } from "@/modules/kitchen/components/pantry-form";
import * as repo from "@/modules/kitchen/db/repository";

export const instant = false;

export default async function KitchenPantryPage() {
  await connection();
  const items = repo.listPantryItems(db);
  const ingredients = repo.listIngredients(db);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Despensa</h1>
        <p className="mt-1 text-sm text-neutral-500">Ingredientes disponibles en casa.</p>
      </header>

      <PantryForm ingredients={ingredients} />

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div>
              <p className="text-sm font-medium">{item.ingredientName}</p>
              <p className="text-xs text-neutral-500">{item.quantity / 100} {item.unit}</p>
            </div>
            <form action={deletePantryItemFormAction}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400">Borrar</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
