"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "@/lib/mapPoints";

const COLORS = { moving: "#16a34a", stopped: "#1D5FD1", offline: "#94a3b8" } as const;
const LABEL = { moving: "En mouvement", stopped: "À l'arrêt", offline: "Hors ligne" } as const;

export default function FleetMap() {
  const el = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const [error, setError] = useState(false);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const fittedRef = useRef(false);

  // Actualisation toutes les 15 secondes
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/vehicles/last-positions", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (alive) { setPoints(j.points); setError(false); }
      } catch { if (alive) setError(true); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!points || points.length === 0 || !el.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(el.current).setView([points[0].latitude, points[0].longitude], 12);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      layerRef.current.clearLayers();
      for (const p of points) {
        const when = new Date(p.recorded_at).toLocaleString("fr-FR", { timeZone: "Africa/Bamako" });
        L.circleMarker([p.latitude, p.longitude], { radius: 10, color: "#fff", weight: 2, fillColor: COLORS[p.state], fillOpacity: 1 })
          .bindTooltip(p.plate, { permanent: true, direction: "top", offset: [0, -8] })
          .bindPopup(`<b>${p.plate}</b><br>${LABEL[p.state]}${p.speed_kmh != null ? " · " + Math.round(p.speed_kmh) + " km/h" : ""}<br>Dernier signal : ${when}`)
          .addTo(layerRef.current);
      }
      if (!fittedRef.current) {
        fittedRef.current = true;
        mapRef.current.fitBounds(points.map((p) => [p.latitude, p.longitude]) as any, { padding: [40, 40], maxZoom: 15 });
      }
    })();
    return () => { cancelled = true; };
  }, [points]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  if (error && !points) return <p className="rounded-lg bg-red-50 p-4 text-red-700">Impossible de charger les positions. Réessayez dans un instant.</p>;
  if (!points) return <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Chargement de la carte…</p>;
  if (points.length === 0) return <p className="rounded-lg bg-white p-4 text-slate-600 ring-1 ring-slate-200">Aucune donnée GPS disponible</p>;
  return (
    <div className="space-y-2">
      <div ref={el} className="h-[65vh] w-full rounded-xl ring-1 ring-slate-200" />
      <p className="text-xs text-slate-500">
        <span style={{ color: COLORS.moving }}>●</span> En mouvement · <span style={{ color: COLORS.stopped }}>●</span> À l'arrêt · <span style={{ color: COLORS.offline }}>●</span> Hors ligne (aucun signal depuis 10 min) — actualisation toutes les 15 s
      </p>
    </div>
  );
}
