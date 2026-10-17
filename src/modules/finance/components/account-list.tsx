import { deleteAccountFormAction } from "../form-actions";
import type { Account } from "../db/repository";

export function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
        No hay cuentas.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {accounts.map((account) => (
        <li
          key={account.id}
          className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
        >
          <div>
            <p className="text-sm font-medium">{account.name}</p>
            <p className="text-xs text-neutral-500">
              {account.type} · {account.currency} · saldo inicial: {account.openingBalance}
              {account.status === "archived" ? " · archivada" : ""}
            </p>
          </div>
          <form action={deleteAccountFormAction} className="contents">
            <input type="hidden" name="id" value={account.id} />
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
