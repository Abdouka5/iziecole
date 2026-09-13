"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, Maximize, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

export function AdminHeader({ fullName }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }

  const initials = (fullName ?? "Super Admin")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#0b1220] px-6">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Rechercher une école, un utilisateur, une transaction..."
          disabled
          className="h-9 border-white/10 bg-white/5 pl-9 pr-14 text-white placeholder:text-white/40"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
          ⌘K
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button type="button" className="text-white/60 hover:text-white" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>
        <button type="button" onClick={handleFullscreen} className="text-white/60 hover:text-white" aria-label="Plein écran">
          <Maximize className="h-5 w-5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 text-white hover:bg-white/5 hover:text-white">
              <Avatar className="h-9 w-9 bg-[#146ef5] text-white">
                <AvatarFallback className="bg-[#146ef5] text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{fullName ?? "Super Admin"}</span>
                <span className="block text-xs leading-tight text-white/50">Super Admin</span>
              </span>
              <ChevronDown className="h-4 w-4 text-white/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push("/admin/settings")}>Paramètres du compte</DropdownMenuItem>
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
