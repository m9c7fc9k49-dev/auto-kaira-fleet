import { createClient } from "@/lib/supabase/server";
import { Stat } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const count = async (t: string, f?: (q: any) => any) => {
    let q = supabase.from(t).select("*", { count: "exact", head: true });
    if (f) q = f(q);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [clients, vehicles, active, planned, inProgress, delivered, alerts] = await Promise.all([
    count("companies"),
    count("vehicles", (q) => q.neq("status", "archived")),
    count("companies", (q) => q.eq("status", "active")),
    count("missions", (q) => q.eq("status", "planned")),
    count("missions", (q) => q.eq("status", "in_progress")),
    count("missions", (q) => q.eq("status", "delivered")),
    count("alerts", (q) => q.is("read_at", null)),
  ]);
  const { data: last } = await supabase.from("vehicle_last_position").select("connection_state");
  const states = (last ?? []) as { connection_state: string }[];
  const n = (s: string) => states.filter((x) => x.connection_state === s).length;
  const noData = Math.max(vehicles - states.length, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Tableau de bord</h1>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Clients" value={clients} hint={`${active} actifs`} />
        <Stat label="Véhicules" value={vehicles} />
        <Stat label="Alertes non lues" value={alerts} />
        <Stat label="Missions en cours" value={inProgress} hint={`${planned} planifiées · ${delivered} livrées`} />
      </section>
      <section>
        <h2 className="mb-2 font-semibold text-slate-700">État des véhicules (données GPS réelles)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="En mouvement" value={n("moving")} />
          <Stat label="À l'arrêt" value={n("stopped")} />
          <Stat label="Hors ligne" value={n("offline")} hint="Aucun signal depuis 10 min" />
          <Stat label="Sans donnée GPS" value={noData} />
        </div>
        {states.length === 0 && (
          <p className="mt-3 rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucune donnée GPS disponible</p>
        )}
      </section>
    </div>
  );
}
