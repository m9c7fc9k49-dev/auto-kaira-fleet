import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toMapPoints } from "@/lib/mapPoints";

// Positions des véhicules de l'utilisateur connecté. La base applique l'isolation (RLS) :
// un client ne reçoit jamais les véhicules d'une autre entreprise.
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const [{ data: vehicles }, { data: last }] = await Promise.all([
    supabase.from("vehicles").select("id, plate").neq("status", "archived"),
    supabase.from("vehicle_last_position").select("vehicle_id, recorded_at, latitude, longitude, speed_kmh, connection_state"),
  ]);
  return NextResponse.json({ points: toMapPoints(vehicles ?? [], (last ?? []) as any[]) }, { headers: { "Cache-Control": "no-store" } });
}
