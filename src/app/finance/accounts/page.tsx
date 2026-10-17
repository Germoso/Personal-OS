import { connection } from "next/server";

import { db } from "@/db";
import { AccountForm } from "@/modules/finance/components/account-form";
import { AccountList } from "@/modules/finance/components/account-list";
import * as repo from "@/modules/finance/db/repository";

export const instant = false;

export default async function FinanceAccountsPage() {
  await connection();

  const accounts = repo.listAccounts(db);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Cuentas</h1>
        <p className="mt-1 text-sm text-neutral-500">Gestiona tus cuentas financieras.</p>
      </header>
      <AccountForm />
      <AccountList accounts={accounts} />
    </section>
  );
}
