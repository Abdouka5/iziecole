"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeMembership } from "./actions";

export function RemoveUserButton({ membershipId, userName }) {
  return (
    <form
      action={removeMembership}
      onSubmit={(e) => {
        if (!confirm(`Supprimer le compte de ${userName} ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Supprimer ${userName}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
