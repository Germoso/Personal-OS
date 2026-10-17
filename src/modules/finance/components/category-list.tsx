import { deleteCategoryFormAction } from "../form-actions";
import type { Category } from "../db/repository";

export function CategoryList({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
        No hay categorías.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <div>
              <p className="text-sm font-medium">{category.name}</p>
              <p className="text-xs text-neutral-500">{category.kind}</p>
            </div>
          </div>
          <form action={deleteCategoryFormAction} className="contents">
            <input type="hidden" name="id" value={category.id} />
            <button
              type="submit"
              className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
            >
              Borrar
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
