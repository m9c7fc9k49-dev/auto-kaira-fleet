import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleIngest } from "@/lib/ingest";

// POST /api/gps/ingest — réception d'une position envoyée par un traceur ou un serveur Traccar.
// Authentification : en-tête « Authorization: Bearer <jeton du traceur> ».
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const admin = createAdminClient();
  const result = await handleIngest(req.headers.get("authorization"), body, {
    async findDevice(tokenHash) {
      const { data } = await admin.from("gps_devices").select("id, vehicle_id, company_id").eq("token_hash", tokenHash).maybeSingle();
      return data;
    },
    async insertPosition(row) { const { error } = await admin.from("positions").insert(row); return !error; },
    async touchDevice(id, at) { await admin.from("gps_devices").update({ last_seen_at: at }).eq("id", id); },
  });
  return NextResponse.json(result.body, { status: result.status });
}
