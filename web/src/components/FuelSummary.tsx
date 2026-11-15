import type { FuelStat } from "@/lib/fuel";

export function FuelSummary({ stats }: { stats: FuelStat[] }) {
  if (stats.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-slate-700">Consommation par véhicule</h2>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Véhicule</th><th className="p-3">Pleins</th><th className="p-3">Litres</th><th className="p-3">Coût</th><th className="p-3">Moyenne</th></tr></thead>
          <tbody>{stats.map((s) => (
            <tr key={s.vehicle_id} className="border-t border-slate-100">
              <td className="p-3 font-medium">{s.plate}</td><td className="p-3">{s.fills}</td>
              <td className="p-3">{s.totalLiters.toLocaleString("fr-FR")} L</td>
              <td className="p-3">{Math.round(s.totalCostFcfa).toLocaleString("fr-FR")} FCFA</td>
              <td className="p-3">{s.avgLPer100 != null ? `${s.avgLPer100} L/100 km` : "Non calculable"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Moyenne estimée à partir des pleins avec kilométrage, en supposant des pleins complets. Elle apparaît dès deux pleins avec kilométrage.</p>
    </section>
  );
}
