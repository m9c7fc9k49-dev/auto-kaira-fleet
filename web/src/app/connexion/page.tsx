"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function Connexion() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B1F3A] p-4">
      <form action={action} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h1 className="text-2xl font-bold text-[#0B1F3A]">Kaïra Flotte</h1>
        <p className="text-sm text-slate-600">Connectez-vous à votre espace.</p>
        <label className="block text-sm font-medium text-slate-700">
          Adresse e-mail
          <input name="email" type="email" required autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Mot de passe
          <input name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending}
          className="w-full rounded-lg bg-[#1D5FD1] py-2.5 font-semibold text-white disabled:opacity-60">
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
