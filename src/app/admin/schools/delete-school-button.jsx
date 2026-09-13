"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSchool } from "./actions";

export function DeleteSchoolButton({ schoolId, schoolName }) {
  return (
    <form
      action={deleteSchool}
      onSubmit={(e) => {
        if (!confirm(`Supprimer définitivement ${schoolName} ? Toutes ses données (élèves, notes, paiements...) seront perdues.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="schoolId" value={schoolId} />
      <Button type="submit" variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Supprimer ${schoolName}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
