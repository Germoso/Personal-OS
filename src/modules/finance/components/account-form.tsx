"use client";

import { useActionState } from "react";

import { createAccountFormAction, type FormState } from "../form-actions";

const INITIAL: FormState = { ok: false };

export function AccountForm() {
  const [state, action] = useActionState(createAccountFormAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Nombre de la cuenta…"
          required
          className="min-w-48 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />
        <select
          name="type"
          defaultValue="checking"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        >
          <option value="checking">Cuenta corriente</option>
          <option value="savings">Ahorro</option>
          <option value="cash">Efectivo</option>
          <option value="credit">Crédito</option>
        </select>
        <input
          name="currency"
          defaultValue="ARS"
          className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
        <input
          type="number"
          name="openingBalance"
          placeholder="Saldo inicial (centavos)"
          className="w-40 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Añadir cuenta
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
