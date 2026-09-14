"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wallet,
  Tag,
  Newspaper,
  BarChart3,
  Settings,
  LifeBuoy,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/schools", label: "Établissements", icon: Building2 },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/subscriptions", label: "Abonnements", icon: CreditCard },
  { href: "/admin/payments", label: "Paiements", icon: Wallet },
  { href: "/admin/plans", label: "Plans & Tarifs", icon: Tag },
  { href: "/admin/content", label: "Contenu", icon: Newspaper },
  { href: "/admin/reports", label: "Rapports", icon: BarChart3 },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
];

export function AdminSidebar({ fullName }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0b1220] md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wordmark-white.png" alt="iziecole" className="h-6 w-auto" />
      </div>
      <p className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
        Super Admin
      </p>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-[#146ef5] text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#146ef5] to-[#7f56d9] p-4">
          <GraduationCap className="absolute -bottom-3 -right-3 h-16 w-16 text-white/10" />
          <p className="relative text-sm font-semibold text-white">
            Une éducation plus connectée demain
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          Déconnexion
        </button>

        <div className="flex items-center gap-2 px-1 text-xs text-white/40">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
            {(fullName ?? "SA").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-white/80">{fullName ?? "Super Admin"}</p>
            <p>Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
