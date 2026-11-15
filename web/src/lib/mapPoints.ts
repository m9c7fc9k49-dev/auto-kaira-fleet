export type MapPoint = {
  vehicle_id: string; plate: string; latitude: number; longitude: number;
  speed_kmh: number | null; recorded_at: string; state: "moving" | "stopped" | "offline";
};
type Last = { vehicle_id: string; recorded_at: string; latitude: number; longitude: number; speed_kmh: number | null; connection_state: string };

export function toMapPoints(vehicles: { id: string; plate: string }[], last: Last[]): MapPoint[] {
  const plates = new Map(vehicles.map((v) => [v.id, v.plate]));
  return last
    .filter((l) => plates.has(l.vehicle_id) && Number.isFinite(l.latitude) && Number.isFinite(l.longitude))
    .map((l) => ({
      vehicle_id: l.vehicle_id, plate: plates.get(l.vehicle_id)!, latitude: l.latitude, longitude: l.longitude,
      speed_kmh: l.speed_kmh == null ? null : Number(l.speed_kmh), recorded_at: l.recorded_at,
      state: (["moving", "stopped", "offline"].includes(l.connection_state) ? l.connection_state : "offline") as MapPoint["state"],
    }));
}
