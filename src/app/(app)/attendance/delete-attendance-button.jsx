"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAttendance } from "./actions";

export function DeleteAttendanceButton({ recordId, studentName }) {
  return (
    <form
      action={deleteAttendance}
      onSubmit={(e) => {
        if (!confirm(`Supprimer cet enregistrement pour ${studentName} ?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="recordId" value={recordId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        aria-label={`Supprimer l'enregistrement de ${studentName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
