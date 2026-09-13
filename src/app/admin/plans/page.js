import { createClient } from "@/lib/supabase/server";
import { getPlatformSettings } from "@/lib/platform-settings";
import { formatFcfa } from "@/lib/subscription-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePlatformSettings } from "./actions";

export default async function AdminPlansPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { subscriptionPrice, subscriptionDurationDays } = await getPlatformSettings(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Plans &amp; Tarifs</h1>
        <p className="text-sm text-muted-foreground">
          iziecole applique un prix unique, toutes fonctionnalités incluses.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Tarif actuel</CardTitle>
          <CardDescription>
            {formatFcfa(subscriptionPrice)} pour {subscriptionDurationDays} jours — appliqué à
            toute nouvelle école et à chaque renouvellement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePlatformSettings} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subscriptionPrice">Prix (FCFA)</Label>
              <Input
                id="subscriptionPrice"
                name="subscriptionPrice"
                type="number"
                min="1"
                step="1"
                defaultValue={subscriptionPrice}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionDurationDays">Durée (jours)</Label>
              <Input
                id="subscriptionDurationDays"
                name="subscriptionDurationDays"
                type="number"
                min="1"
                step="1"
                defaultValue={subscriptionDurationDays}
                required
              />
            </div>
            {params.error ? <p className="text-sm text-destructive sm:col-span-2">{params.error}</p> : null}
            {params.saved ? <p className="text-sm text-status-good sm:col-span-2">Tarif mis à jour.</p> : null}
            <div className="sm:col-span-2">
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="max-w-xl text-sm text-muted-foreground">
        Un changement ici s&apos;applique aux nouvelles écoles et aux prochains
        renouvellements — il ne modifie pas rétroactivement les paiements déjà
        enregistrés.
      </p>
    </div>
  );
}
