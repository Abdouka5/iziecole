import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Wireframe of the cashier workflow (§5.3): recherche élève -> paiement du
// mois -> confirmation -> reçu thermique. Not wired to data yet — the
// on-site thermal printing mechanism is still an open decision, see
// docs/decisions.md.
export default function CaissePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-heading font-semibold text-brand-ink">Caisse du jour</h1>
        <p className="text-sm text-muted-foreground">
          Rechercher un élève, encaisser un paiement, imprimer le reçu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rechercher un élève</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nom, prénom ou matricule…"
              className="pl-9"
              disabled
            />
          </div>
          <Button disabled>Rechercher</Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sélectionnez un élève pour saisir un paiement et imprimer le reçu (58mm/80mm).
        </CardContent>
      </Card>
    </div>
  );
}
