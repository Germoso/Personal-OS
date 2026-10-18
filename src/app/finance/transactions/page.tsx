import { connection } from "next/server";

import { db } from "@/db";
import { TransactionForm } from "@/modules/finance/components/transaction-form";
import { TransactionList } from "@/modules/finance/components/transaction-list";
import * as repo from "@/modules/finance/db/repository";

export const instant = false;

export default async function FinanceTransactionsPage() {
  await connection();

  const accounts = repo.listAccounts(db, "active");
  const categories = repo.listCategories(db);
  const transactions = repo.listTransactions(db);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-normal">Transacciones</h1>
        <p className="mt-1 text-sm text-neutral-500">Registrá ingresos y gastos.</p>
      </header>
      <TransactionForm accounts={accountOptions} categories={categoryOptions} />
      <TransactionList
        transactions={transactions}
        accounts={accountOptions}
        categories={categoryOptions.map((c) => ({ id: c.id, name: c.name }))}
      />
    </section>
  );
}
