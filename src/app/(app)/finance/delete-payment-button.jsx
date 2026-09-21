"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePayment } from "./actions";

// The confirm() lives here, not inline in finance/page.js: that page is a
// Server Component, and an onSubmit handler can't be passed to a DOM
// element from one (it crashes the render at request time).
export function DeletePaymentButton({ paymentId, studentName }) {
  return (
    <form
      action={deletePayment}
      onSubmit={(e) => {
        if (!confirm(`Supprimer ce paiement${studentName ? ` de ${studentName}` : ""} ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="paymentId" value={paymentId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        aria-label="Supprimer le paiement"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
