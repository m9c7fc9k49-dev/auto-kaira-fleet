import { describe, it, expect } from "vitest";
import { computeFuelStats } from "../fuel";
import { toMapPoints } from "../mapPoints";

const r = (d: string, l: number, odo: number | null, v = "v1") => ({ vehicle_id: v, plate: v === "v1" ? "A-1" : "B-2", filled_on: d, liters: l, unit_price_fcfa: 700, odometer_km: odo });

describe("consommation de carburant", () => {
  it("calcule L/100 km entre deux pleins avec kilométrage", () => {
    const s = computeFuelStats([r("2026-11-01", 100, 10000), r("2026-11-05", 50, 10200)]);
    expect(s[0].avgLPer100).toBe(25); // 50 L pour 200 km
    expect(s[0].km).toBe(200);
  });
  it("ne donne pas de moyenne avec un seul plein ou sans kilométrage", () => {
    expect(computeFuelStats([r("2026-11-01", 100, 10000)])[0].avgLPer100).toBeNull();
    expect(computeFuelStats([r("2026-11-01", 100, null), r("2026-11-05", 50, null)])[0].avgLPer100).toBeNull();
  });
  it("ignore un kilométrage qui recule (erreur de saisie)", () => {
    expect(computeFuelStats([r("2026-11-01", 100, 10000), r("2026-11-05", 50, 9000)])[0].avgLPer100).toBeNull();
  });
  it("totalise litres et coût par véhicule, sans mélanger les véhicules", () => {
    const s = computeFuelStats([r("2026-11-01", 100, 1000), r("2026-11-02", 10, null, "v2")]);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ plate: "A-1", totalLiters: 100, totalCostFcfa: 70000 });
  });
  it("trie les pleins par date même s'ils arrivent dans le désordre", () => {
    const s = computeFuelStats([r("2026-11-05", 50, 10200), r("2026-11-01", 100, 10000)]);
    expect(s[0].avgLPer100).toBe(25);
  });
});

describe("points de la carte", () => {
  it("n'affiche que les véhicules connus et jamais de position inventée", () => {
    const pts = toMapPoints([{ id: "v1", plate: "A-1" }], [
      { vehicle_id: "v1", recorded_at: "2026-11-05T10:00:00Z", latitude: 12.6, longitude: -8, speed_kmh: 40, connection_state: "moving" },
      { vehicle_id: "inconnu", recorded_at: "2026-11-05T10:00:00Z", latitude: 1, longitude: 1, speed_kmh: 0, connection_state: "stopped" },
    ]);
    expect(pts).toHaveLength(1);
    expect(pts[0]).toMatchObject({ plate: "A-1", state: "moving" });
    expect(toMapPoints([], [])).toEqual([]);
  });
});
