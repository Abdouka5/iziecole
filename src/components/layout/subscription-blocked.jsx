import { Lock } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFcfa } from "@/lib/subscription-plans";
import { paySubscription } from "@/app/(app)/settings/actions";

export function SubscriptionBlocked({ canRenew, neverPaid, subscriptionPrice, subscriptionDurationDays }) {
  const heading = neverPaid ? "Abonnement non activé" : "Abonnement expiré";
  const message = canRenew
    ? neverPaid
      ? `Activez l'abonnement iziecole (${formatFcfa(subscriptionPrice)} / ${subscriptionDurationDays} jours) pour commencer à utiliser l'application.`
      : `L'accès à cette page est suspendu. Renouvelez l'abonnement (${formatFcfa(subscriptionPrice)} / ${subscriptionDurationDays} jours) pour continuer à utiliser iziecole.`
    : neverPaid
      ? "L'abonnement de votre établissement n'a pas encore été activé. Contactez la direction."
      : "L'abonnement de votre établissement est arrivé à échéance. Contactez la direction pour le renouveler.";

  return (
    <div className="flex h-full items-center justify-center py-16">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{heading}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          {canRenew ? (
            <form action={paySubscription} className="mt-2">
              <SubmitButton pendingText="Redirection vers le paiement...">
                {neverPaid ? "Activer maintenant" : "Renouveler maintenant"}
              </SubmitButton>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
