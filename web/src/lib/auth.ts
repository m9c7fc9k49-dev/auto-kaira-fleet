import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "super_admin" | "fleet_manager" | "client_admin" | "client_user";
export type Profile = { id: string; role: Role; company_id: string | null; full_name: string | null };

export const isStaff = (r: Role) => r === "super_admin" || r === "fleet_manager";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles").select("id, role, company_id, full_name").eq("id", auth.user.id).single();
  return (data as Profile) ?? null;
}

// Protection côté serveur : à appeler dans chaque layout privé.
export async function requireStaff(): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/connexion");
  if (!isStaff(p.role)) redirect("/client");
  return p;
}
export async function requireClient(): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/connexion");
  if (isStaff(p.role)) redirect("/gestion");
  return p;
}
