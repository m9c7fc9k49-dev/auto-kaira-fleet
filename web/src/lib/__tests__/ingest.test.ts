import { describe, it, expect } from "vitest";
import { handleIngest } from "../ingest";
import { hashToken } from "../gps";

const TOKEN = "kf_test_token";
const device = { id: "d1", vehicle_id: "v1", company_id: "c1" };
const NOW = new Date("2026-11-05T12:00:00Z");

function fakeDb() {
  const inserted: Record<string, any>[] = []; let touched = "";
  return {
    inserted, get touched() { return touched; },
    async findDevice(h: string) { return h === hashToken(TOKEN) ? device : null; },
    async insertPosition(r: Record<string, any>) { inserted.push(r); return true; },
    async touchDevice(_id: string, at: string) { touched = at; },
  };
}

describe("API de réception GPS", () => {
  it("refuse sans jeton (401)", async () => {
    const r = await handleIngest(null, { latitude: 1, longitude: 1 }, fakeDb(), NOW);
    expect(r.status).toBe(401);
  });
  it("refuse un jeton inconnu (401) et n'enregistre rien", async () => {
    const db = fakeDb();
    const r = await handleIngest("Bearer faux", { latitude: 1, longitude: 1 }, db, NOW);
    expect(r.status).toBe(401); expect(db.inserted).toHaveLength(0);
  });
  it("refuse des coordonnées hors limites (400)", async () => {
    const db = fakeDb();
    const r = await handleIngest(`Bearer ${TOKEN}`, { latitude: 91, longitude: 0 }, db, NOW);
    expect(r.status).toBe(400); expect(db.inserted).toHaveLength(0);
  });
  it("refuse un horodatage dans le futur (400)", async () => {
    const r = await handleIngest(`Bearer ${TOKEN}`, { latitude: 12.6, longitude: -8, timestamp: "2026-11-06T12:00:00Z" }, fakeDb(), NOW);
    expect(r.status).toBe(400);
  });
  it("enregistre la position avec le véhicule et l'entreprise du traceur (201)", async () => {
    const db = fakeDb();
    const r = await handleIngest(`Bearer ${TOKEN}`, { latitude: 12.6392, longitude: -8.0029, speed_kmh: 55, heading_deg: 90, timestamp: "2026-11-05T11:59:00Z" }, db, NOW);
    expect(r.status).toBe(201);
    expect(db.inserted[0]).toMatchObject({ vehicle_id: "v1", company_id: "c1", device_id: "d1", latitude: 12.6392, speed_kmh: 55 });
    expect(db.touched).toBe(NOW.toISOString());
  });
  it("ignore tout véhicule/entreprise envoyé par le traceur (ne fait confiance qu'au jeton)", async () => {
    const db = fakeDb();
    await handleIngest(`Bearer ${TOKEN}`, { latitude: 1, longitude: 1, vehicle_id: "autre", company_id: "autre" }, db, NOW);
    expect(db.inserted[0]).toMatchObject({ vehicle_id: "v1", company_id: "c1" });
  });
  it("convertit les nœuds (Traccar) en km/h", async () => {
    const db = fakeDb();
    await handleIngest(`Bearer ${TOKEN}`, { latitude: 1, longitude: 1, speed_knots: 10 }, db, NOW);
    expect(db.inserted[0].speed_kmh).toBe(18.5);
  });
  it("sans horodatage, utilise l'heure de réception", async () => {
    const db = fakeDb();
    await handleIngest(`Bearer ${TOKEN}`, { latitude: 1, longitude: 1 }, db, NOW);
    expect(db.inserted[0].recorded_at).toBe(NOW.toISOString());
  });
});
