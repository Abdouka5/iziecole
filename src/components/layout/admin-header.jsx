"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Maximize,
  Building2,
  UserRound,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { searchPlatform } from "@/app/admin/search-actions";

const NOTIFICATION_ICON = {
  school: Building2,
  payment: Wallet,
  subscription: AlertTriangle,
};

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Il y a ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

function useNow() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function AdminHeader({ notifications = [] }) {
  const router = useRouter();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isPending, startTransition] = useTransition();
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setResults(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const r = await searchPlatform(query);
        setResults(r);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }

  function goTo(href) {
    setResults(null);
    setQuery("");
    router.push(href);
  }

  const hasResults = results && (results.schools.length > 0 || results.users.length > 0);
  const dateTimeLabel = now
    ? `${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-white px-6">
      <div ref={boxRef} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une école, un utilisateur..."
          className="h-9 pl-9 pr-14"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>

        {results ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border bg-popover p-2 shadow-md">
            {isPending ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Recherche...</p>
            ) : hasResults ? (
              <>
                {results.schools.length > 0 ? (
                  <div className="mb-1">
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Écoles</p>
                    {results.schools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goTo(`/admin/schools?q=${encodeURIComponent(s.name)}`)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {s.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {results.users.length > 0 ? (
                  <div>
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilisateurs</p>
                    {results.users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => goTo(`/admin/users?q=${encodeURIComponent(u.full_name ?? "")}`)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        {u.full_name ?? "Sans nom"}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Aucun résultat.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <p className="hidden whitespace-nowrap text-sm capitalize text-muted-foreground lg:block">{dateTimeLabel}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {notifications.length}
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <p className="px-2 py-1.5 text-sm font-semibold">Notifications</p>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Rien de nouveau.</p>
            ) : (
              notifications.map((n) => {
                const Icon = NOTIFICATION_ICON[n.type] ?? Bell;
                return (
                  <DropdownMenuItem key={n.id} className="flex items-start gap-2.5 py-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.at)}</span>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={handleFullscreen} className="text-muted-foreground hover:text-foreground" aria-label="Plein écran">
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
