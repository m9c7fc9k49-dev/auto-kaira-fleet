import { requireClient } from "@/lib/auth";
import { Shell } from "@/components/Shell";

// Menu client : volontairement SANS véhicules/chauffeurs/missions/finances (réservés à Kaïra).
const nav = [
  { href: "/client", label: "Ma flotte" },
  { href: "/client/carte", label: "Carte" },
  { href: "/client/carburant", label: "Carburant" },
  { href: "/client/alertes", label: "Alertes" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const p = await requireClient(); // refuse le personnel et les non-connectés
  return <Shell title="Espace client" name={p.full_name ?? ""} nav={nav}>{children}</Shell>;
}
