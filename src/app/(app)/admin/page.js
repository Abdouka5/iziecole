import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PLAN_LABELS } from "@/lib/subscription-plans";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SUBSCRIPTION_STATUS_LABELS = {
  paid: "À jour",
  pending: "En attente",
  failed: "Échoué",
  cancelled: "Annulé",
  none: "Aucun paiement",
};

export default async function AdminSchoolsPage() {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, slug, subscription_plan, created_at")
    .order("created_at", { ascending: false });

  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("school_id, status, created_at")
    .order("created_at", { ascending: false });

  const latestStatusBySchool = new Map();
  for (const payment of payments ?? []) {
    if (!latestStatusBySchool.has(payment.school_id)) {
      latestStatusBySchool.set(payment.school_id, payment.status);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-heading font-semibold text-brand-ink">Écoles</h1>
        <p className="text-sm text-muted-foreground">
          Toutes les écoles inscrites sur iziecole.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Établissement</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Abonnement</TableHead>
            <TableHead>Inscrite le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(schools ?? []).map((school) => {
            const status = latestStatusBySchool.get(school.id) ?? "none";
            return (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {PLAN_LABELS[school.subscription_plan] ?? school.subscription_plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={status === "paid" ? "default" : "secondary"}>
                    {SUBSCRIPTION_STATUS_LABELS[status] ?? status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(school.created_at).toLocaleDateString("fr-FR")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
