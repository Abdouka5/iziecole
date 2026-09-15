"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE, ROLE_LABELS } from "./sidebar";

// The desktop Sidebar is `hidden md:flex` — below that breakpoint there was
// previously no way to navigate at all. This is the mobile equivalent: a
// hamburger button that opens the same nav list in an off-canvas drawer.
export function MobileNav({ role, fullName }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.school_admin;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex h-full w-72 max-w-[85vw] flex-col bg-[#0b1220]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/wordmark-white.png" alt="iziecole" className="h-8 w-auto" />
              <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Fermer le menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-base font-medium transition-colors",
                      active ? "bg-[#146ef5] text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
              {role === "school_admin" ? (
                <Link
                  href="/support"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <LifeBuoy className="h-4.5 w-4.5 shrink-0" />
                  Contacter le support
                </Link>
              ) : null}

              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-white">{fullName || "Mon compte"}</p>
                <p className="text-xs font-medium text-[#f9a86b]">{ROLE_LABELS[role] ?? role}</p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-base font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
