"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Each row posts teacher_name_<key> / teacher_phone_<key> — the server
// action scans formData for that prefix, so keys only need to be unique.
// Inputs are uncontrolled (defaultValue) so adding/removing a row never
// disturbs what was typed in the others.
export function TeacherFields({ initialTeachers = [] }) {
  const baseId = useId();
  const [rows, setRows] = useState(() =>
    (initialTeachers.length ? initialTeachers : [{}]).map((t, i) => ({
      key: `${baseId}-${i}`,
      name: t.full_name ?? "",
      phone: t.phone ?? "",
    })),
  );

  function addRow() {
    setRows((prev) => [...prev, { key: `${baseId}-${prev.length}-${Date.now()}`, name: "", phone: "" }]);
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`teacher-name-${row.key}`}>Nom complet</Label>
            <Input
              id={`teacher-name-${row.key}`}
              name={`teacher_name_${row.key}`}
              defaultValue={row.name}
              placeholder="Nom de l'enseignant"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`teacher-phone-${row.key}`}>Téléphone</Label>
            <Input
              id={`teacher-phone-${row.key}`}
              name={`teacher_phone_${row.key}`}
              type="tel"
              defaultValue={row.phone}
              placeholder="+221 77 123 45 67"
            />
          </div>
          <div className="flex items-end">
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.key)}
                aria-label="Retirer cet enseignant"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1.5 h-4 w-4" />
        Ajouter un enseignant
      </Button>
    </div>
  );
}
