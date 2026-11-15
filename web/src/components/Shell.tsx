import Link from "next/link";
import { logout } from "@/app/connexion/actions";

export type NavItem = { href: string; label: string };

export function Shell({ title, name, nav, children }: { title: string; name: string; nav: NavItem[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0B1F3A] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-bold">Kaïra Flotte</p>
            <p className="text-xs text-blue-200">{title}</p>
          </div>
          <form action={logout} className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-blue-100">{name}</span>
            <button className="rounded-lg bg-[#1D5FD1] px-3 py-1.5 font-medium">Déconnexion</button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-blue-100 hover:bg-white/10">{n.label}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#0B1F3A]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
