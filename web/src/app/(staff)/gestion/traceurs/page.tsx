import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field, selectCls } from "@/components/ActionForm";
import { createDevice } from "../actions";

export const dynamic = "force-dynamic";

export default async function Traceurs() {
  const supabase = await createClient();
  const [{ data }, { data: vehicles }] = await Promise.all([
    supabase.from("gps_devices").select("id, imei, label, last_seen_at, vehicles(plate), companies:company_id(name)").order("created_at", { ascending: false }),
    supabase.from("vehicles").select("id, plate, companies(name)").neq("status", "archived").order("plate"),
  ]);
  const rows = (data ?? []) as any[];
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Traceurs GPS</h1>
      <p className="text-sm text-slate-600">Associez chaque traceur physique à un véhicule. Un jeton secret est généré : il sert à configurer le traceur (ou Traccar) pour envoyer ses positions.</p>
      {(vehicles ?? []).length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">Ajoutez d'abord un véhicule.</p>
      ) : (
        <ActionForm action={createDevice} label="Associer le traceur">
          <Field label="Véhicule" name="vehicle_id" required>
            <select name="vehicle_id" required className={selectCls}>{((vehicles ?? []) as any[]).map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.companies?.name}</option>)}</select>
          </Field>
          <Field label="IMEI / identifiant du traceur" name="imei" required />
          <Field label="Nom (optionnel)" name="label" />
        </ActionForm>
      )}
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun traceur associé. Aucune donnée GPS disponible.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">IMEI</th><th className="p-3">Véhicule</th><th className="p-3">Client</th><th className="p-3">Dernier signal</th></tr></thead>
            <tbody>{rows.map((d) => (
              <tr key={d.id} className="border-t border-slate-100"><td className="p-3 font-medium">{d.imei}</td><td className="p-3">{d.vehicles?.plate}</td><td className="p-3">{d.companies?.name}</td><td className="p-3">{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("fr-FR", { timeZone: "Africa/Bamako" }) : "Jamais"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
