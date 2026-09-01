"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Wallet,
  CalendarClock,
  MessageSquare,
  Settings,
  Receipt,
  Building2,
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
    { href: "/students", label: "Élèves", icon: Users },
    { href: "/grades", label: "Notes & bulletins", icon: GraduationCap },
    { href: "/finance", label: "Finances", icon: Wallet },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
    { href: "/communication", label: "Communication", icon: MessageSquare },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ],
  teacher: [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/grades", label: "Notes", icon: GraduationCap },
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
    { href: "/grades", label: "Mes notes", icon: GraduationCap },
    { href: "/schedule", label: "Emploi du temps", icon: CalendarClock },
  ],
};

export function Sidebar({ role }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.school_admin;

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Logo className="text-xl" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
