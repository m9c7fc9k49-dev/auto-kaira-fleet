import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const generateToken = () => "kf_" + randomBytes(24).toString("hex");

const KNOTS_TO_KMH = 1.852;

// Format accepté (JSON). Compatible avec un transfert depuis Traccar (vitesse en nœuds : champ speed_knots).
export const positionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.union([z.string(), z.number()]).optional(), // ISO 8601 ou secondes/millisecondes Unix
  speed_kmh: z.number().min(0).max(400).optional(),
  speed_knots: z.number().min(0).max(220).optional(),
  heading_deg: z.number().min(0).max(360).optional(),
});
export type PositionInput = z.infer<typeof positionSchema>;

export function parseTimestamp(ts: PositionInput["timestamp"], now = new Date()): Date | null {
  if (ts === undefined) return now;
  let d: Date;
  if (typeof ts === "number") d = new Date(ts < 1e12 ? ts * 1000 : ts);
  else d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > now.getTime() + 5 * 60_000) return null; // refuse le futur
  return d;
}

export function buildPositionRow(
  device: { id: string; vehicle_id: string; company_id: string },
  p: PositionInput,
  recordedAt: Date,
) {
  const speed = p.speed_kmh ?? (p.speed_knots !== undefined ? Math.round(p.speed_knots * KNOTS_TO_KMH * 10) / 10 : null);
  return {
    vehicle_id: device.vehicle_id,
    company_id: device.company_id,
    device_id: device.id,
    recorded_at: recordedAt.toISOString(),
    latitude: p.latitude,
    longitude: p.longitude,
    speed_kmh: speed,
    heading_deg: p.heading_deg ?? null,
  };
}
