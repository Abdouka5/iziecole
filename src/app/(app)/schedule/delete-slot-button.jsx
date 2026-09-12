"use client";

import { X } from "lucide-react";
import { deleteSlot } from "./actions";

export function DeleteSlotButton({ slotId }) {
  return (
    <form
      action={deleteSlot}
      onSubmit={(e) => {
        if (!confirm("Supprimer ce cours de l'emploi du temps ?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="slotId" value={slotId} />
      <button
        type="submit"
        className="rounded p-0.5 text-current/60 hover:bg-black/10"
        aria-label="Supprimer ce cours"
      >
        <X className="h-3 w-3" />
      </button>
    </form>
  );
}
