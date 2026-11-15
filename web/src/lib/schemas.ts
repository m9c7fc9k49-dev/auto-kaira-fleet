import { z } from "zod";

const opt = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const req = (msg: string) => z.string().trim().min(1, msg);
const id = z.string().uuid("Sélection invalide");
// Nombre optionnel : un champ laissé vide reste « non renseigné » (et non 0).
const optNum = (msg: string) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.coerce.number().min(0, msg).optional());

export const companySchema = z.object({
  name: req("Le nom de l'entreprise est obligatoire"),
  contact_name: opt, phone: opt,
  email: z.string().trim().email("E-mail invalide").or(z.literal("")).transform((v) => v || undefined).optional(),
  address: opt,
});

export const vehicleSchema = z.object({
  company_id: id,
  plate: req("L'immatriculation est obligatoire").transform((v) => v.toUpperCase()),
  brand: opt, model: opt, vehicle_type: opt, chassis_number: opt,
  capacity_kg: optNum("Capacité invalide"),
});

export const driverSchema = z.object({
  company_id: id,
  first_name: req("Le prénom est obligatoire"),
  last_name: req("Le nom est obligatoire"),
  phone: opt, address: opt, license_number: opt,
  license_expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").or(z.literal("")).transform((v) => v || undefined).optional(),
});

export const fuelSchema = z.object({
  vehicle_id: id,
  filled_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  liters: z.coerce.number().gt(0, "La quantité doit être supérieure à 0"),
  unit_price_fcfa: z.coerce.number().min(0, "Prix invalide"),
  odometer_km: optNum("Kilométrage invalide"),
});

export const companyStatusSchema = z.object({ id, status: z.enum(["active", "suspended", "disabled"]) });

export const deviceSchema = z.object({
  vehicle_id: id,
  imei: z.string().trim().regex(/^[A-Za-z0-9-]{6,32}$/, "Identifiant du traceur invalide (6 à 32 caractères, lettres et chiffres)"),
  label: opt,
});
