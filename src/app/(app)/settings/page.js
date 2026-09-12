import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PLAN_LABELS, PLAN_PRICES, formatFcfa } from "@/lib/subscription-plans";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { paySubscription } from "./actions";

const STATUS_LABELS = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
};

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin" && membership.role !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("id, period_label, amount, status, created_at")
    .eq("school_id", membership.school.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const plan = membership.school.subscription_plan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-heading font-semibold text-brand-ink">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Établissement, année scolaire et abonnement iziecole.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonnement iziecole</CardTitle>
          <CardDescription>
            {PLAN_LABELS[plan]} — {formatFcfa(PLAN_PRICES[plan])}/mois
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={paySubscription}>
            <Button type="submit">Payer l&apos;abonnement de ce mois</Button>
          </form>

          {payments?.length ? (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Derniers paiements</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{p.period_label}</span>
                    <span className="flex items-center gap-2">
                      {formatFcfa(Number(p.amount))}
                      <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré pour l&apos;instant.</p>
          )}
        </CardContent>
      </Card>

      <ModulePlaceholder
        title="Établissement & comptes"
        description="Informations de l'établissement, année scolaire courante, gestion des comptes (enseignants, caissiers, admins)."
      />
    </div>
  );
}
