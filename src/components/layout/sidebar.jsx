"use client";

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
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

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

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Logo className="text-xl" />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Réduire le menu"
        >
          <ChevronsLeft className="h-4 w-4" />
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t p-4">
        <div className="rounded-xl bg-primary/10 p-4">
          <Crown className="h-5 w-5 text-brand-saffron" />
          <p className="mt-2 text-sm font-semibold text-brand-ink">Passez à Premium</p>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Logo className="text-xs" />
          <span>v1.0.0</span>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Tous droits réservés
        </p>
      </div>
    </aside>
  );
}
