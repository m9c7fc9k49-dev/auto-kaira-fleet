import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field, selectCls } from "@/components/ActionForm";
import { addFuel } from "../actions";
import { FuelSummary } from "@/components/FuelSummary";
import { computeFuelStats } from "@/lib/fuel";

export const dynamic = "force-dynamic";
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default async function Carburant() {
  const supabase = await createClient();
  const [{ data }, { data: vehicles }] = await Promise.all([
    supabase.from("fuel_logs").select("id, vehicle_id, filled_on, liters, unit_price_fcfa, odometer_km, vehicles(plate), companies(name)").order("filled_on", { ascending: false }).limit(200),
    supabase.from("vehicles").select("id, plate, companies(name)").neq("status", "archived").order("plate"),
  ]);
  const rows = (data ?? []) as any[];
  const stats = computeFuelStats(rows.map((r) => ({ vehicle_id: r.vehicle_id, plate: r.vehicles?.plate ?? "?", filled_on: r.filled_on, liters: r.liters, unit_price_fcfa: r.unit_price_fcfa, odometer_km: r.odometer_km })));
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Carburant</h1>
      {(vehicles ?? []).length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">Ajoutez d'abord un véhicule.</p>
      ) : (
        <ActionForm action={addFuel} label="Enregistrer le plein">
          <Field label="Véhicule" name="vehicle_id" required>
            <select name="vehicle_id" required className={selectCls}>{((vehicles ?? []) as any[]).map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.companies?.name}</option>)}</select>
          </Field>
          <Field label="Date du plein" name="filled_on" type="date" required />
          <Field label="Quantité (litres)" name="liters" type="number" required />
          <Field label="Prix par litre (FCFA)" name="unit_price_fcfa" type="number" required />
          <Field label="Kilométrage (optionnel)" name="odometer_km" type="number" />
        </ActionForm>
      )}
      <FuelSummary stats={stats} />
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun plein enregistré.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Date</th><th className="p-3">Véhicule</th><th className="p-3">Client</th><th className="p-3">Litres</th><th className="p-3">Coût</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100"><td className="p-3">{r.filled_on}</td><td className="p-3">{r.vehicles?.plate}</td><td className="p-3">{r.companies?.name}</td><td className="p-3">{Number(r.liters)}</td><td className="p-3">{fcfa(r.liters * r.unit_price_fcfa)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
