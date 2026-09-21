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

const RELATIONSHIPS = ["Père", "Mère", "Tuteur", "Tutrice", "Frère", "Sœur", "Autre"];
const OTHER = "Autre";

// One guardian. Posts guardian_name_<key>, guardian_phone_<key>,
// guardian_relationship_<key> — the relationship goes out through a hidden
// input (not the Select's own name) so that picking "Autre" can send the
// free text the user typed instead of the literal word "Autre".
function GuardianRow({ rowKey, canRemove, onRemove }) {
  const [relationship, setRelationship] = useState("");
  const [custom, setCustom] = useState("");
  const isOther = relationship === OTHER;
  const submittedRelationship = isOther ? custom.trim() || OTHER : relationship;

  return (
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_150px_auto]">
      <div className="space-y-1.5">
        <Label htmlFor={`guardian-name-${rowKey}`}>Nom complet</Label>
        <Input id={`guardian-name-${rowKey}`} name={`guardian_name_${rowKey}`} placeholder="Nom du parent/responsable" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`guardian-phone-${rowKey}`}>Téléphone</Label>
        <Input id={`guardian-phone-${rowKey}`} name={`guardian_phone_${rowKey}`} type="tel" placeholder="+221 77 123 45 67" />
      </div>
      <div className="space-y-1.5">
        <Label>Responsabilité</Label>
        <Select value={relationship} onValueChange={setRelationship}>
          <SelectTrigger className="w-full">
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
        <input type="hidden" name={`guardian_relationship_${rowKey}`} value={submittedRelationship} />
      </div>
      <div className="flex items-end">
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Retirer ce parent/responsable"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {isOther ? (
        <div className="space-y-1.5 sm:col-span-4">
          <Label htmlFor={`guardian-custom-${rowKey}`}>Précisez le lien avec l&apos;élève</Label>
          <Input
            id={`guardian-custom-${rowKey}`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Ex. Oncle, Tante, Grand-mère…"
          />
        </div>
      ) : null}
    </div>
  );
}

// The keys only need to be unique, not sequential — the server action just
// scans formData for the guardian_* prefix.
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
      {rows.map((key) => (
        <GuardianRow key={key} rowKey={key} canRemove={rows.length > 1} onRemove={() => removeRow(key)} />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1.5 h-4 w-4" />
        Ajouter un parent/responsable
      </Button>
    </div>
  );
}
