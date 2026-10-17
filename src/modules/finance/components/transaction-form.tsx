"use client";

import { useActionState } from "react";

import { createTransactionFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function TransactionForm({
  accounts,
  categories,
}: {
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; kind: string }[];
}) {
  const [state, action] = useActionState(createTransactionFormAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap gap-2">
        <select
          name="accountId"
          required
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        >
          <option value="">Cuenta…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="amount"
          placeholder="Monto (centavos)"
          required
          className="w-36 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
        <input
          type="date"
          name="date"
          required
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
        <select
          name="categoryId"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.kind})
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue="cleared"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        >
          <option value="cleared">Cleared</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Añadir transacción
        </button>
        {state.ok ? (
          <span className="text-sm text-emerald-400">Guardada</span>
        ) : state.error ? (
          <span className="text-sm text-red-400">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
