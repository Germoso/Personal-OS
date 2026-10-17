import { connection } from "next/server";

import { db } from "@/db";
import { CategoryForm } from "@/modules/finance/components/category-form";
import { CategoryList } from "@/modules/finance/components/category-list";
import * as repo from "@/modules/finance/db/repository";

export const instant = false;

export default async function FinanceCategoriesPage() {
  await connection();

  const categories = repo.listCategories(db);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Categorías</h1>
        <p className="mt-1 text-sm text-neutral-500">Categorías de ingresos y gastos.</p>
      </header>
      <CategoryForm />
      <CategoryList categories={categories} />
    </section>
  );
}
