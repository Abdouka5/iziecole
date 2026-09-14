"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, User, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MobileNav } from "./mobile-nav";
import { searchSchool } from "@/app/(app)/search-actions";

const SEARCH_PLACEHOLDER_BY_PATH = {
  "/dashboard": "Rechercher un élève, une classe...",
  "/students": "Rechercher un élève par nom, prénom, matricule...",
  "/classes": "Rechercher une classe...",
  "/grades": "Rechercher un élève, une classe...",
  "/finance": "Rechercher un élève, une classe...",
  "/schedule": "Rechercher un élève, une classe...",
};

function useNow() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function Header({ role }) {
  const router = useRouter();
  const pathname = usePathname();
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
        const r = await searchSchool(query);
        setResults(r);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function goTo(href) {
    setResults(null);
    setQuery("");
    router.push(href);
  }

  const searchPlaceholder = SEARCH_PLACEHOLDER_BY_PATH[pathname] ?? "Rechercher...";
  const hasResults = results && (results.students.length > 0 || results.classes.length > 0);
  const dateTimeLabel = now
    ? `${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
      <MobileNav role={role} />

      <div ref={boxRef} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-9 pr-14"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
          ⌘K
        </kbd>

        {results ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border bg-popover p-2 shadow-md">
            {isPending ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Recherche...</p>
            ) : hasResults ? (
              <>
                {results.students.length > 0 ? (
                  <div className="mb-1">
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Élèves</p>
                    {results.students.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goTo(`/students/${s.id}`)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {s.first_name} {s.last_name}
                        <span className="ml-auto text-xs text-muted-foreground">{s.matricule}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {results.classes.length > 0 ? (
                  <div>
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classes</p>
                    {results.classes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => goTo("/classes")}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {c.name}
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

      <p className="hidden shrink-0 whitespace-nowrap text-sm capitalize text-muted-foreground lg:block">{dateTimeLabel}</p>
    </header>
  );
}
