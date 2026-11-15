import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field } from "@/components/ActionForm";
import { createCompany, setCompanyStatus } from "../actions";

export const dynamic = "force-dynamic";
const label: Record<string, string> = { active: "Actif", suspended: "Suspendu", disabled: "Désactivé" };

export default async function Clients() {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("id, name, contact_name, phone, status").order("name");
  const rows = data ?? [];
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Clients</h1>
      <ActionForm action={createCompany} label="Ajouter le client">
        <Field label="Nom de l'entreprise" name="name" required />
        <Field label="Personne à contacter" name="contact_name" />
        <Field label="Téléphone" name="phone" type="tel" />
        <Field label="E-mail" name="email" type="email" />
        <Field label="Adresse" name="address" />
      </ActionForm>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun client pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Entreprise</th><th className="p-3">Contact</th><th className="p-3">Téléphone</th><th className="p-3">Statut</th><th className="p-3">Action</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.contact_name ?? "—"}</td><td className="p-3">{c.phone ?? "—"}</td><td className="p-3">{label[c.status]}</td>
                <td className="p-3">
                  <form action={setCompanyStatus} className="flex gap-1">
                    <input type="hidden" name="id" value={c.id} />
                    {c.status !== "active" && <button name="status" value="active" className="rounded bg-green-600 px-2 py-1 text-xs text-white">Activer</button>}
                    {c.status === "active" && <button name="status" value="suspended" className="rounded bg-amber-600 px-2 py-1 text-xs text-white">Suspendre</button>}
                    {c.status !== "disabled" && <button name="status" value="disabled" className="rounded bg-red-600 px-2 py-1 text-xs text-white">Désactiver</button>}
                  </form>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
