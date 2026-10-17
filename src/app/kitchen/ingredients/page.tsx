import { connection } from "next/server";

import { db } from "@/db";
import { IngredientForm } from "@/modules/kitchen/components/ingredient-form";
import { IngredientList } from "@/modules/kitchen/components/ingredient-list";
import * as repo from "@/modules/kitchen/db/repository";

export const instant = false;

export default async function KitchenIngredientsPage() {
  await connection();
  const ingredients = repo.listIngredients(db);
  return (
    <section className="flex flex-col gap-6">
      <header><h1 className="text-xl font-semibold">Ingredientes</h1><p className="mt-1 text-sm text-neutral-500">Vocabulario compartido entre recetas, compras y despensa.</p></header>
      <IngredientForm />
      <IngredientList ingredients={ingredients} />
    </section>
  );
}
