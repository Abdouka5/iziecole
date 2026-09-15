"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markPaymentAsPaid } from "./actions";

export function MarkPaidButton({ paymentId, schoolName }) {
  return (
    <form
      action={markPaymentAsPaid}
      onSubmit={(e) => {
        if (!confirm(`Confirmer que ${schoolName} a bien payé cette période ? À utiliser seulement si le paiement a été vérifié manuellement (le webhook PayTech n'est pas arrivé).`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="paymentId" value={paymentId} />
      <Button type="submit" variant="ghost" size="icon" aria-label={`Marquer le paiement de ${schoolName} comme payé`}>
        <Check className="h-4 w-4" />
      </Button>
    </form>
  );
}
