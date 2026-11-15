import { describe, it, expect } from "vitest";
import { companySchema, vehicleSchema, driverSchema, fuelSchema, companyStatusSchema } from "../schemas";

const uuid = "aaaaaaaa-0000-4000-8000-000000000001";

describe("validation des formulaires", () => {
  it("refuse un client sans nom", () => {
    expect(companySchema.safeParse({ name: "  " }).success).toBe(false);
  });
  it("accepte un client avec champs optionnels vides", () => {
    const r = companySchema.safeParse({ name: "Transport A", email: "", phone: "" });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.email).toBeUndefined(); expect(r.data.phone).toBeUndefined(); }
  });
  it("refuse un e-mail invalide", () => {
    expect(companySchema.safeParse({ name: "A", email: "pas-un-email" }).success).toBe(false);
  });
  it("met l'immatriculation en majuscules", () => {
    const r = vehicleSchema.safeParse({ company_id: uuid, plate: "bko-1234" });
    expect(r.success && r.data.plate).toBe("BKO-1234");
  });
  it("refuse un véhicule sans client valide", () => {
    expect(vehicleSchema.safeParse({ company_id: "abc", plate: "X" }).success).toBe(false);
  });
  it("refuse une capacité négative", () => {
    expect(vehicleSchema.safeParse({ company_id: uuid, plate: "X", capacity_kg: "-5" }).success).toBe(false);
  });
  it("exige prénom et nom du chauffeur", () => {
    expect(driverSchema.safeParse({ company_id: uuid, first_name: "Ali", last_name: "" }).success).toBe(false);
  });
  it("refuse une date de permis mal formée", () => {
    expect(driverSchema.safeParse({ company_id: uuid, first_name: "A", last_name: "B", license_expires_on: "12/05/2027" }).success).toBe(false);
  });
  it("refuse 0 litre ou un prix négatif", () => {
    const base = { vehicle_id: uuid, filled_on: "2026-11-05" };
    expect(fuelSchema.safeParse({ ...base, liters: "0", unit_price_fcfa: "700" }).success).toBe(false);
    expect(fuelSchema.safeParse({ ...base, liters: "50", unit_price_fcfa: "-1" }).success).toBe(false);
  });
  it("accepte un plein valide avec kilométrage vide", () => {
    const r = fuelSchema.safeParse({ vehicle_id: uuid, filled_on: "2026-11-05", liters: "120.5", unit_price_fcfa: "700", odometer_km: "" });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.liters).toBe(120.5); expect(r.data.odometer_km).toBeUndefined(); }
  });
  it("refuse un statut de client inconnu", () => {
    expect(companyStatusSchema.safeParse({ id: uuid, status: "admin" }).success).toBe(false);
  });
});
