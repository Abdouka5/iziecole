"use client";

import { Trash2 } from "lucide-react";
import { deleteStudent } from "./actions";

export function DeleteStudentButton({ studentId, studentName }) {
  return (
    <form
      action={deleteStudent}
      onSubmit={(e) => {
        if (!confirm(`Supprimer ${studentName} ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Supprimer ${studentName}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
