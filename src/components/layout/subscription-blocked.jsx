import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFcfa } from "@/lib/subscription-plans";

export function SubscriptionBlocked({ canRenew, subscriptionPrice, subscriptionDurationDays }) {
  return (
    <div className="flex h-full items-center justify-center py-16">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Abonnement expiré</h2>
          <p className="text-sm text-muted-foreground">
            {canRenew
              ? `L'accès à cette page est suspendu. Renouvelez l'abonnement (${formatFcfa(subscriptionPrice)} / ${subscriptionDurationDays} jours) pour continuer à utiliser iziecole.`
              : "L'abonnement de votre établissement est arrivé à échéance. Contactez la direction pour le renouveler."}
          </p>
          {canRenew ? (
            <Button asChild className="mt-2">
              <Link href="/settings?section=subscription">Renouveler maintenant</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
