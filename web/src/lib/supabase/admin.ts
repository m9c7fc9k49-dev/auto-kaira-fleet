import { createClient } from "@supabase/supabase-js";

// Clé de service : contourne la RLS. À utiliser UNIQUEMENT côté serveur, jamais dans une page ou un composant client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration serveur incomplète");
  return createClient(url, key, { auth: { persistSession: false } });
}
