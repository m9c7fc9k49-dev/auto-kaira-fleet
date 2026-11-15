"use server";
import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { companySchema, vehicleSchema, driverSchema, fuelSchema, companyStatusSchema, deviceSchema } from "@/lib/schemas";
import { generateToken, hashToken } from "@/lib/gps";

export type FormState = { error?: string; ok?: string } | undefined;

function parse<T>(schema: ZodType<T>, fd: FormData) {
  const raw = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));
  return schema.safeParse(raw);
}
const friendly = (msg: string) => (msg.includes("duplicate key") ? "Cet enregistrement existe déjà." : msg.includes("n'appartient pas") || msg.includes("autre entreprise") ? msg : "Opération refusée ou impossible.");

export async function createCompany(_: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const r = parse(companySchema, fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const { error } = await (await createClient()).from("companies").insert(r.data);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/gestion/clients");
  return { ok: "Client ajouté." };
}

export async function setCompanyStatus(fd: FormData) {
  await requireStaff();
  const r = parse(companyStatusSchema, fd);
  if (!r.success) return;
  await (await createClient()).from("companies").update({ status: r.data.status }).eq("id", r.data.id);
  revalidatePath("/gestion/clients");
}

export async function createVehicle(_: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const r = parse(vehicleSchema, fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const { error } = await (await createClient()).from("vehicles").insert(r.data);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/gestion/vehicules");
  return { ok: "Véhicule ajouté." };
}

export async function archiveVehicle(fd: FormData) {
  await requireStaff();
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await (await createClient()).from("vehicles").update({ status: "archived" }).eq("id", id);
  revalidatePath("/gestion/vehicules");
}

export async function createDriver(_: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const r = parse(driverSchema, fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const { error } = await (await createClient()).from("drivers").insert(r.data);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/gestion/chauffeurs");
  return { ok: "Chauffeur ajouté." };
}

export async function addFuel(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireStaff();
  const r = parse(fuelSchema, fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const supabase = await createClient();
  // L'entreprise est déduite du véhicule (jamais saisie à la main) ; la base revérifie la cohérence.
  const { data: v } = await supabase.from("vehicles").select("company_id").eq("id", r.data.vehicle_id).single();
  if (!v) return { error: "Véhicule introuvable." };
  const { error } = await supabase.from("fuel_logs").insert({ ...r.data, company_id: v.company_id, created_by: me.id });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/gestion/carburant");
  return { ok: "Plein enregistré." };
}

export async function createDevice(_: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const r = parse(deviceSchema, fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const supabase = await createClient();
  const { data: v } = await supabase.from("vehicles").select("company_id").eq("id", r.data.vehicle_id).single();
  if (!v) return { error: "Véhicule introuvable." };
  const token = generateToken();
  const { error } = await supabase.from("gps_devices").insert({ ...r.data, company_id: v.company_id, token_hash: hashToken(token) });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/gestion/traceurs");
  // Le jeton n'est stocké qu'sous forme d'empreinte : on ne peut plus le réafficher après.
  return { ok: `Traceur associé. Copiez ce jeton maintenant, il ne sera plus jamais affiché : ${token}` };
}
