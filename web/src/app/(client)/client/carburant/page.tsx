import { createClient } from "@/lib/supabase/server";
import { FuelSummary } from "@/components/FuelSummary";
import { computeFuelStats } from "@/lib/fuel";

export const dynamic = "force-dynamic";
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default async function Carburant() {
  const supabase = await createClient();
  const { data } = await supabase.from("fuel_logs").select("id, vehicle_id, filled_on, liters, unit_price_fcfa, odometer_km, vehicles(plate)").order("filled_on", { ascending: false }).limit(200);
  const rows = (data ?? []) as any[];
  const stats = computeFuelStats(rows.map((r) => ({ vehicle_id: r.vehicle_id, plate: r.vehicles?.plate ?? "?", filled_on: r.filled_on, liters: r.liters, unit_price_fcfa: r.unit_price_fcfa, odometer_km: r.odometer_km })));
  const totalL = rows.reduce((s, r) => s + Number(r.liters), 0);
  const totalC = rows.reduce((s, r) => s + Number(r.liters) * Number(r.unit_price_fcfa), 0);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Carburant</h1>
      <p className="text-sm text-slate-600">Consultation uniquement. Les pleins sont enregistrés par l'équipe Kaïra Flotte.</p>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun plein enregistré.</p>
      ) : (
        <>
          <FuelSummary stats={stats} />
          <p className="font-medium">Total : {totalL.toLocaleString("fr-FR")} L · {fcfa(totalC)}</p>
          <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Date</th><th className="p-3">Véhicule</th><th className="p-3">Litres</th><th className="p-3">Coût</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100"><td className="p-3">{r.filled_on}</td><td className="p-3">{r.vehicles?.plate}</td><td className="p-3">{Number(r.liters)}</td><td className="p-3">{fcfa(r.liters * r.unit_price_fcfa)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
