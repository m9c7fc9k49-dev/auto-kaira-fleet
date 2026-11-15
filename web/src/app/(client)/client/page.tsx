import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const cs: Record<string, string> = { moving: "En mouvement", stopped: "À l'arrêt", offline: "Hors ligne" };

export default async function MaFlotte() {
  const supabase = await createClient(); // la base ne renvoie QUE les véhicules de cette entreprise (RLS)
  const { data: vehicles } = await supabase.from("vehicles").select("id, plate, brand, model").order("plate");
  const { data: last } = await supabase.from("vehicle_last_position").select("vehicle_id, recorded_at, latitude, longitude, speed_kmh, connection_state");
  const byVehicle = new Map((last ?? []).map((l: any) => [l.vehicle_id, l]));
  const rows = vehicles ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Ma flotte</h1>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucun véhicule pour le moment.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((v) => {
            const l: any = byVehicle.get(v.id);
            return (
              <li key={v.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-[#0B1F3A]">{v.plate} <span className="font-normal text-slate-500">{[v.brand, v.model].filter(Boolean).join(" ")}</span></p>
                {l ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {cs[l.connection_state]} · dernière position {new Date(l.recorded_at).toLocaleString("fr-FR", { timeZone: "Africa/Bamako" })}
                    <br />{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}{l.speed_kmh != null ? ` · ${Math.round(l.speed_kmh)} km/h` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Aucune donnée GPS disponible</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
