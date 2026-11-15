"use client";
import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/(staff)/gestion/actions";

export function ActionForm({ action, label, children }: { action: (s: FormState, f: FormData) => Promise<FormState>; label: string; children: React.ReactNode }) {
  const [state, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={run} className="grid gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2">
      {children}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-[#1D5FD1] px-4 py-2 font-semibold text-white disabled:opacity-60">{pending ? "Enregistrement…" : label}</button>
        {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-green-700">{state.ok}</p>}
      </div>
    </form>
  );
}

export function Field({ label, name, type = "text", required, children }: { label: string; name: string; type?: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}{required && " *"}
      {children ?? <input name={name} type={type} required={required} step={type === "number" ? "any" : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />}
    </label>
  );
}

export const selectCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
