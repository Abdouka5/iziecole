"use client";

import { useTransition } from "react";
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

export function GradeFilters({ classes, terms, subjects }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4">
      <Select value={searchParams.get("classId") ?? ""} onValueChange={(v) => updateParam("classId", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Classe" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("termId") ?? ""} onValueChange={(v) => updateParam("termId", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Période" />
        </SelectTrigger>
        <SelectContent>
          {terms.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("subjectId") ?? ""} onValueChange={(v) => updateParam("subjectId", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Matière" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((s) => (
            <SelectItem key={s.classSubjectId} value={s.classSubjectId}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          onBlur={(e) => updateParam("q", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParam("q", e.currentTarget.value)}
          placeholder="Rechercher un élève..."
          className="pl-9"
        />
      </div>
    </div>
  );
}
