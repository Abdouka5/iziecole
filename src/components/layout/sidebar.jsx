"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  GraduationCap,
  FileText,
  Wallet,
  CalendarClock,
  Briefcase,
  KeyRound,
  Settings,
  Receipt,
  Building2,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "iziecole_sidebar_collapsed";

// One entry per role. Keep this in sync with the modules in
// docs/cahier-des-charges.md §5 and the RLS policies each page relies on.
const NAV_BY_ROLE = {
  super_admin: [
    { href: "/admin", label: "Console Super Admin", icon: Building2 },
    { href: "/dashboard", label: "Tableau de bord (école)", icon: LayoutDashboard },
  ],
  school_admin: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/students", label: "Élèves", icon: User },
    { href: "/classes", label: "Classes", icon: GraduationCap },
    { href: "/grades", label: "Notes & bulletins", icon: FileText },
    { href: "/finance", label: "Finances", icon: Wallet },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
    { href: "/personnel", label: "Personnel", icon: Briefcase },
    { href: "/users", label: "Utilisateurs", icon: KeyRound },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ],
  teacher: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/grades", label: "Notes", icon: FileText },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
  ],
  cashier: [{ href: "/caisse", label: "Caisse", icon: Receipt }],
  parent: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/finance", label: "Paiements", icon: Wallet },
  ],
  student: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/grades", label: "Mes notes", icon: FileText },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
  ],
};

export function Sidebar({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.school_admin;
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (private mode, etc.) — default expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore — collapse preference just won't persist this session.
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-white/10 bg-[#0b1220] transition-[width] duration-200 md:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        {!collapsed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/wordmark-white.png" alt="iziecole" className="h-6 w-auto" />
        ) : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="text-white/60 hover:text-white"
          aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-base font-medium transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-[#146ef5] text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span className="flex-1">{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-3 border-t border-white/10 p-4", collapsed && "flex flex-col items-center px-2")}>
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? "Déconnexion" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-base font-medium text-red-400 transition-colors hover:bg-red-500/10",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed ? "Déconnexion" : null}
        </button>
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between text-xs text-white/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/wordmark-white.png" alt="iziecole" className="h-4 w-auto" />
              <span>v1.0.0</span>
            </div>
            <p className="text-center text-[11px] text-white/40">
              © {new Date().getFullYear()} Tous droits réservés
            </p>
          </>
        ) : null}
      </div>
    </aside>
  );
}
