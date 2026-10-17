import { deleteTransactionFormAction } from "../form-actions";
import type { Transaction } from "../db/repository";

export function TransactionList({
  transactions,
  accounts,
  categories,
}: {
  transactions: Transaction[];
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}) {
  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `#${id}`;
  const categoryName = (id: number | null) =>
    id === null ? "—" : (categories.find((c) => c.id === id)?.name ?? `#${id}`);

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
        No hay transacciones.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{tx.description || "(sin descripción)"}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {tx.date} · {accountName(tx.accountId)} · {categoryName(tx.categoryId)} · {tx.status}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={
                tx.amount >= 0 ? "text-sm font-medium text-emerald-400" : "text-sm font-medium text-red-400"
              }
            >
              {tx.amount >= 0 ? "+" : ""}
              {tx.amount}
            </span>
            <form action={deleteTransactionFormAction} className="contents">
              <input type="hidden" name="id" value={tx.id} />
              <button
                type="submit"
                className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
              >
                Borrar
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
