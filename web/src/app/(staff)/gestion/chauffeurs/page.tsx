import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field, selectCls } from "@/components/ActionForm";
import { createDriver } from "../actions";

export const dynamic = "force-dynamic";

export default async function Chauffeurs() {
  const supabase = await createClient();
  const [{ data }, { data: companies }] = await Promise.all([
    supabase.from("drivers").select("id, first_name, last_name, phone, license_expires_on, companies(name)").order("last_name"),
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
  ]);
  const rows = (data ?? []) as any[];
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Chauffeurs</h1>
      {(companies ?? []).length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">Ajoutez d'abord un client actif.</p>
      ) : (
        <ActionForm action={createDriver} label="Ajouter le chauffeur">
          <Field label="Client" name="company_id" required>
            <select name="company_id" required className={selectCls}>{(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          <Field label="Prénom" name="first_name" required />
          <Field label="Nom" name="last_name" required />
          <Field label="Téléphone" name="phone" type="tel" />
          <Field label="Adresse" name="address" />
          <Field label="N° de permis" name="license_number" />
          <Field label="Expiration du permis" name="license_expires_on" type="date" />
        </ActionForm>
      )}
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun chauffeur enregistré.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Nom</th><th className="p-3">Téléphone</th><th className="p-3">Client</th><th className="p-3">Permis valable jusqu'au</th></tr></thead>
            <tbody>{rows.map((d) => (
              <tr key={d.id} className="border-t border-slate-100"><td className="p-3 font-medium">{d.first_name} {d.last_name}</td><td className="p-3">{d.phone ?? "—"}</td><td className="p-3">{d.companies?.name}</td><td className="p-3">{d.license_expires_on ?? "—"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
