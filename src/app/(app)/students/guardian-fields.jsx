"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RELATIONSHIPS = ["Père", "Mère", "Tuteur", "Tutrice", "Autre"];

// Each row posts guardian_name_<key>, guardian_phone_<key>,
// guardian_relationship_<key> — the server action just scans formData for
// that prefix, so the keys only need to be unique, not sequential.
export function GuardianFields({ initialCount = 1 }) {
  const baseId = useId();
  const [rows, setRows] = useState(
    Array.from({ length: initialCount }, (_, i) => `${baseId}-${i}`),
  );

  function addRow() {
    setRows((prev) => [...prev, `${baseId}-${prev.length}-${Date.now()}`]);
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((k) => k !== key));
  }

  return (
    <div className="space-y-3">
      {rows.map((key, index) => (
        <div key={key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_140px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`guardian-name-${key}`}>Nom complet</Label>
            <Input id={`guardian-name-${key}`} name={`guardian_name_${key}`} placeholder="Nom du parent/responsable" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`guardian-phone-${key}`}>Téléphone</Label>
            <Input id={`guardian-phone-${key}`} name={`guardian_phone_${key}`} type="tel" placeholder="+221 77 123 45 67" />
          </div>
          <div className="space-y-1.5">
            <Label>Responsabilité</Label>
            <Select name={`guardian_relationship_${key}`}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(key)}
                aria-label="Retirer ce parent/responsable"
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
        Ajouter un parent/responsable
      </Button>
    </div>
  );
}
