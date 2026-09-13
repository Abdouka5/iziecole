"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, ChevronDown, Bell, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SEARCH_PLACEHOLDER_BY_PATH = {
  "/dashboard": "Rechercher un élève, une classe, une note...",
  "/students": "Rechercher un élève par nom, prénom, matricule...",
  "/classes": "Rechercher une classe, un niveau, un enseignant...",
  "/grades": "Rechercher un élève, une classe, une matière...",
  "/finance": "Rechercher un élève, une classe, une facture...",
  "/schedule": "Rechercher un élève, une classe, un enseignant...",
};

export function Header({ school, role, fullName, notificationCount = 0 }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (fullName ?? school?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const searchPlaceholder = SEARCH_PLACEHOLDER_BY_PATH[pathname] ?? "Rechercher...";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          className="h-9 pl-9 pr-14"
          disabled
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {notificationCount}
            </span>
          ) : null}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-9 w-9 bg-primary text-primary-foreground">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">
                  {fullName ?? school?.name}
                </span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {ROLE_LABELS[role] ?? role}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push("/select-school")}>
              Changer d&apos;établissement
            </DropdownMenuItem>
            {role === "school_admin" ? (
              <DropdownMenuItem onSelect={() => router.push("/support")}>Contacter le support</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
