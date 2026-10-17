import { connection } from "next/server";

import { db } from "@/db";
import { AccountList } from "@/modules/finance/components/account-list";
import { TransactionList } from "@/modules/finance/components/transaction-list";
import * as repo from "@/modules/finance/db/repository";

export const instant = false;

export default async function FinancePage() {
  await connection();

  const accounts = repo.listAccounts(db, "active");
  const recent = repo.recentTransactions(db, 10);
  const total = repo.totalBalance(db);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categories = repo.listCategories(db).map((c) => ({ id: c.id, name: c.name }));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Finanzas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Balance total:{" "}
          <span className={total >= 0 ? "text-emerald-400" : "text-red-400"}>
            {total}
          </span>{" "}
          centavos
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-sm font-semibold">Cuentas</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {accounts.map((a) => (
              <li key={a.id} className="flex justify-between text-sm">
                <span>{a.name}</span>
                <span className={repo.accountBalance(db, a.id) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {repo.accountBalance(db, a.id)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Últimas transacciones</h2>
        <TransactionList transactions={recent} accounts={accountOptions} categories={categories} />
      </div>

      <nav className="flex gap-2 text-sm">
        <a href="/finance/accounts" className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100">
          Cuentas
        </a>
        <a href="/finance/categories" className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100">
          Categorías
        </a>
        <a href="/finance/transactions" className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100">
          Transacciones
        </a>
      </nav>
    </section>
  );
}
