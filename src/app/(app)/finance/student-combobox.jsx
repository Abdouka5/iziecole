"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// A plain search-and-pick field (no cmdk/Popover dependency): typing
// filters the list below, selecting one fills the hidden studentId input
// the server action reads. Each option shows classe + âge so a caissier
// can tell same-named students apart.
//
// amountInputId (optional) is the id of an uncontrolled amount <input>
// elsewhere in the form: picking a student pre-fills it with their class's
// monthly fee. It's an id, not a callback, because this is rendered from a
// Server Component page, which can't pass functions down.
export function StudentCombobox({ students, name = "studentId", amountInputId }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const autoFilledRef = useRef("");

  const selected = students.find((s) => s.id === selectedId);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students.slice(0, 30);
    return students
      .filter((s) =>
        `${s.first_name} ${s.last_name} ${s.matricule}`.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [students, query]);

  function prefillAmount(s) {
    const input = amountInputId ? document.getElementById(amountInputId) : null;
    if (!input) return;
    if (s.monthlyFee != null) {
      const value = String(Math.round(s.monthlyFee));
      input.value = value;
      autoFilledRef.current = value;
    } else if (input.value === autoFilledRef.current) {
      // The previous student's fee would otherwise linger for a class
      // with no fee set — but leave anything the cashier typed themselves.
      input.value = "";
      autoFilledRef.current = "";
    }
  }

  function selectStudent(s) {
    setSelectedId(s.id);
    setQuery(`${s.first_name} ${s.last_name}`);
    setOpen(false);
    prefillAmount(s);
  }

  function handleBlur(e) {
    // Let a click on a result register before we close the list.
    if (containerRef.current?.contains(e.relatedTarget)) return;
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef} onBlur={handleBlur}>
      <input type="hidden" name={name} value={selectedId} required />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId("");
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
                  s.id === selectedId && "bg-accent",
                )}
              >
                <span>
                  <span className="font-medium">{s.first_name} {s.last_name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">Mat. {s.matricule}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {s.className ?? "Non affecté"}
                  {s.age != null ? ` — ${s.age} ans` : ""}
                  {s.id === selectedId ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {selected ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {selected.className ?? "Non affecté"}
          {selected.age != null ? ` — ${selected.age} ans` : ""}
          {selected.monthlyFee != null
            ? ` — Mensualité : ${selected.monthlyFee.toLocaleString("fr-FR")} FCFA`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
