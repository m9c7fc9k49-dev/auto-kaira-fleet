export type FuelRow = {
  vehicle_id: string; plate: string; filled_on: string;
  liters: number; unit_price_fcfa: number; odometer_km: number | null;
};
export type FuelStat = {
  vehicle_id: string; plate: string; fills: number; totalLiters: number; totalCostFcfa: number;
  km: number | null; avgLPer100: number | null;
};

// Consommation moyenne estimée : entre deux pleins consécutifs avec kilométrage,
// on suppose que le plein suivant remet le réservoir au niveau précédent (pleins complets).
export function computeFuelStats(rows: FuelRow[]): FuelStat[] {
  const byVehicle = new Map<string, FuelRow[]>();
  for (const r of rows) {
    const list = byVehicle.get(r.vehicle_id) ?? [];
    list.push({ ...r, liters: Number(r.liters), unit_price_fcfa: Number(r.unit_price_fcfa), odometer_km: r.odometer_km == null ? null : Number(r.odometer_km) });
    byVehicle.set(r.vehicle_id, list);
  }
  const out: FuelStat[] = [];
  for (const [vehicle_id, list] of byVehicle) {
    list.sort((a, b) => a.filled_on.localeCompare(b.filled_on) || (a.odometer_km ?? 0) - (b.odometer_km ?? 0));
    const withOdo = list.filter((r) => r.odometer_km != null);
    let sumL = 0, sumKm = 0;
    for (let i = 1; i < withOdo.length; i++) {
      const km = withOdo[i].odometer_km! - withOdo[i - 1].odometer_km!;
      if (km > 0) { sumKm += km; sumL += withOdo[i].liters; }
    }
    out.push({
      vehicle_id, plate: list[0].plate, fills: list.length,
      totalLiters: list.reduce((s, r) => s + r.liters, 0),
      totalCostFcfa: list.reduce((s, r) => s + r.liters * r.unit_price_fcfa, 0),
      km: sumKm > 0 ? sumKm : null,
      avgLPer100: sumKm > 0 ? Math.round((sumL / sumKm) * 1000) / 10 : null,
    });
  }
  return out.sort((a, b) => a.plate.localeCompare(b.plate));
}
