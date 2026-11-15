import { redirect } from "next/navigation";
import { getProfile, isStaff } from "@/lib/auth";

export default async function Home() {
  const p = await getProfile();
  if (!p) redirect("/connexion");
  redirect(isStaff(p.role) ? "/gestion" : "/client");
}
