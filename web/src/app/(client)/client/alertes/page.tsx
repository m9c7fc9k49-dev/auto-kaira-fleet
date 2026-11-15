import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Alertes() {
  const supabase = await createClient();
  const { data } = await supabase.from("alerts").select("id, type, message, created_at, read_at").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Alertes</h1>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucune alerte.</p>
      ) : (
        <ul className="space-y-2">{rows.map((a) => (
          <li key={a.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p className="text-sm">{a.message}</p>
            <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString("fr-FR", { timeZone: "Africa/Bamako" })}</p>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
