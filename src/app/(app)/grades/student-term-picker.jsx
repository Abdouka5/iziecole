"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Check, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { termOrdinalLabel } from "@/lib/report-card";
import { cn } from "@/lib/utils";

// Step 1 of "Saisir des notes" when it isn't opened from a specific
// student's row: pick who and which trimestre, then swap this same modal
// to the full matière-by-matière editor by adding studentId/termId to the
// URL — no separate dialog, just this component's own conditional content.
export function StudentTermPicker({ students, terms, initialTermId }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState(initialTermId ?? terms[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = students.find((s) => s.id === studentId);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students.slice(0, 30);
    return students
      .filter((s) => `${s.firstName} ${s.lastName} ${s.matricule}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [students, query]);

  function selectStudent(s) {
    setStudentId(s.id);
    setQuery(`${s.firstName} ${s.lastName}`);
    setOpen(false);
  }

  function handleBlur(e) {
    if (containerRef.current?.contains(e.relatedTarget)) return;
    setOpen(false);
  }

  function handleContinue() {
    if (!studentId || !termId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("entry", "1");
    params.set("studentId", studentId);
    params.set("gradeTermId", termId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Élève</Label>
        <div className="relative" ref={containerRef} onBlur={handleBlur}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setStudentId("");
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Rechercher un élève par nom ou matricule..."
              className="pl-9"
              autoComplete="off"
            />
          </div>

          {open ? (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
              {results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Aucun élève trouvé.</p>
              ) : (
                results.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                      s.id === studentId && "bg-accent",
                    )}
                  >
                    <span>
                      <span className="font-medium">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="ml-1.5 text-xs text-muted-foreground">Mat. {s.matricule}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {s.className ?? "Non affecté"}
                      {s.id === studentId ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Trimestre</Label>
        <Select value={termId} onValueChange={setTermId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {termOrdinalLabel(t.sequence)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" onClick={handleContinue} disabled={!studentId || !termId} className="w-full">
        Continuer
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
