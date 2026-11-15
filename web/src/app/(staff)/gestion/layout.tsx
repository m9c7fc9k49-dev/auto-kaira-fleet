import { requireStaff } from "@/lib/auth";
import { Shell } from "@/components/Shell";

const nav = [
  { href: "/gestion", label: "Tableau de bord" },
  { href: "/gestion/carte", label: "Carte" },
  { href: "/gestion/clients", label: "Clients" },
  { href: "/gestion/vehicules", label: "Véhicules" },
  { href: "/gestion/chauffeurs", label: "Chauffeurs" },
  { href: "/gestion/carburant", label: "Carburant" },
  { href: "/gestion/traceurs", label: "Traceurs GPS" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const p = await requireStaff(); // refuse tout client, même par URL directe
  return <Shell title="Espace gestionnaire" name={p.full_name ?? ""} nav={nav}>{children}</Shell>;
}
