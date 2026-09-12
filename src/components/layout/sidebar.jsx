"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  GraduationCap,
  FileText,
  Wallet,
  CalendarClock,
  MessageSquare,
  Folder,
  Settings,
  Receipt,
  Building2,
  Crown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "iziecole_sidebar_collapsed";

// One entry per role. Keep this in sync with the modules in
// docs/cahier-des-charges.md §5 and the RLS policies each page relies on.
const NAV_BY_ROLE = {
  super_admin: [
    { href: "/admin", label: "Écoles", icon: Building2 },
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  ],
  school_admin: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/students", label: "Élèves", icon: User },
    { href: "/classes", label: "Classes", icon: GraduationCap },
    { href: "/grades", label: "Notes & bulletins", icon: FileText },
    { href: "/finance", label: "Finances", icon: Wallet },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
    { href: "/communication", label: "Communication", icon: MessageSquare },
    { href: "/documents", label: "Documents", icon: Folder },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ],
  teacher: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/grades", label: "Notes", icon: FileText },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
    { href: "/communication", label: "Communication", icon: MessageSquare },
  ],
  cashier: [{ href: "/caisse", label: "Caisse", icon: Receipt }],
  parent: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/finance", label: "Paiements", icon: Wallet },
    { href: "/communication", label: "Annonces", icon: MessageSquare },
  ],
  student: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/grades", label: "Mes notes", icon: FileText },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
  ],
};

export function Sidebar({ role, unreadCount = 0 }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.school_admin;
  const [collapsed, setCollapsed] = useState(false);

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
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        {!collapsed ? <Logo className="text-xl" /> : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const showBadge = href === "/communication" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[11px] px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? (
                <>
                  <span className="flex-1">{label}</span>
                  {showBadge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-3 border-t border-sidebar-border p-4", collapsed && "flex flex-col items-center px-2")}>
        {!collapsed ? (
          <div className="rounded-2xl bg-primary/10 p-4">
            <Crown className="h-5 w-5 text-brand-saffron" />
            <p className="mt-2 text-sm font-semibold text-foreground">Passez à Premium</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Plus de fonctionnalités pour votre école
            </p>
            <Link
              href="/settings"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              En savoir plus →
            </Link>
          </div>
        ) : (
          <Crown className="h-5 w-5 text-brand-saffron" />
        )}
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Logo className="text-xs" />
              <span>v1.0.0</span>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} Tous droits réservés
            </p>
          </>
        ) : null}
      </div>
    </aside>
  );
}
