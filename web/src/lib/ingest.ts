import { hashToken, positionSchema, parseTimestamp, buildPositionRow } from "./gps";

type Db = {
  findDevice(tokenHash: string): Promise<{ id: string; vehicle_id: string; company_id: string } | null>;
  insertPosition(row: Record<string, unknown>): Promise<boolean>;
  touchDevice(id: string, at: string): Promise<void>;
};

// Logique pure et testable : renvoie un code HTTP et un message.
export async function handleIngest(authHeader: string | null, body: unknown, db: Db, now = new Date()) {
  const token = authHeader?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return { status: 401, body: { error: "Jeton manquant" } };
  const device = await db.findDevice(hashToken(token));
  if (!device) return { status: 401, body: { error: "Jeton invalide" } };

  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "Données invalides", detail: parsed.error.issues[0].message } };
  const when = parseTimestamp(parsed.data.timestamp, now);
  if (!when) return { status: 400, body: { error: "Horodatage invalide ou dans le futur" } };

  const ok = await db.insertPosition(buildPositionRow(device, parsed.data, when));
  if (!ok) return { status: 500, body: { error: "Enregistrement impossible" } };
  await db.touchDevice(device.id, now.toISOString());
  return { status: 201, body: { ok: true } };
}
