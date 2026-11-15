import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field, selectCls } from "@/components/ActionForm";
import { createVehicle, archiveVehicle } from "../actions";

export const dynamic = "force-dynamic";
const st: Record<string, string> = { available: "Disponible", on_mission: "En mission", immobilized: "Immobilisé", maintenance: "En maintenance", archived: "Archivé" };

export default async function Vehicules() {
  const supabase = await createClient();
  const [{ data }, { data: companies }] = await Promise.all([
    supabase.from("vehicles").select("id, plate, brand, model, status, companies(name)").neq("status", "archived").order("plate"),
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
  ]);
  const rows = (data ?? []) as any[];
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Véhicules</h1>
      {(companies ?? []).length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">Ajoutez d'abord un client actif pour pouvoir enregistrer un véhicule.</p>
      ) : (
        <ActionForm action={createVehicle} label="Ajouter le véhicule">
          <Field label="Client propriétaire" name="company_id" required>
            <select name="company_id" required className={selectCls}>{(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          <Field label="Immatriculation" name="plate" required />
          <Field label="Marque" name="brand" />
          <Field label="Modèle" name="model" />
          <Field label="Type (camion, citerne…)" name="vehicle_type" />
          <Field label="Capacité (kg)" name="capacity_kg" type="number" />
          <Field label="Numéro de châssis" name="chassis_number" />
        </ActionForm>
      )}
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun véhicule enregistré.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Immatriculation</th><th className="p-3">Marque / modèle</th><th className="p-3">Client</th><th className="p-3">Statut</th><th className="p-3">Action</th></tr></thead>
            <tbody>{rows.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{v.plate}</td><td className="p-3">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</td><td className="p-3">{v.companies?.name ?? "—"}</td><td className="p-3">{st[v.status]}</td>
                <td className="p-3"><form action={archiveVehicle}><input type="hidden" name="id" value={v.id} /><button className="rounded bg-slate-600 px-2 py-1 text-xs text-white">Archiver</button></form></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
