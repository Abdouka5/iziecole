"use client";

import { Trash2 } from "lucide-react";
import { deleteClass } from "./actions";

// The confirm() must live in a client component — the classes page is a
// Server Component and can't pass an onSubmit handler to a DOM element.
export function DeleteClassButton({ classId, classLabel }) {
  return (
    <form
      action={deleteClass}
      onSubmit={(e) => {
        if (
          !confirm(
            `Supprimer la classe ${classLabel} ? Son emploi du temps et ses matières associées seront aussi supprimés. Cette action est irréversible.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <button
        type="submit"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Supprimer ${classLabel}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
