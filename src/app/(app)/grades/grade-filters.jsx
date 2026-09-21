"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A Radix Select can't be un-picked and can't hold an empty item value, so
// each dropdown gets an explicit "Toutes …" entry that clears its param.
const ALL = "all";

export function GradeFilters({ classes, terms, subjects }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const onSelect = (key) => (value) => updateParam(key, value === ALL ? "" : value);

  // Search as you type (debounced) instead of waiting for Enter or a blur.
  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("q") ?? "";
    if (query.trim() === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [query, router, pathname]);

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4">
      <Select value={searchParams.get("classId") ?? ""} onValueChange={onSelect("classId")}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Classe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes les classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("termId") ?? ""} onValueChange={onSelect("termId")}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Période" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes les périodes</SelectItem>
          {terms.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("subjectId") ?? ""} onValueChange={onSelect("subjectId")}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Matière" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes les matières</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un élève..."
          className="pl-9"
        />
      </div>
    </div>
  );
}
