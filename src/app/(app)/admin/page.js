import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { getSubscriptionStatus } from "@/lib/subscription-status";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminSchoolsPage() {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  const statuses = await Promise.all(
    (schools ?? []).map((s) => getSubscriptionStatus(supabase, s.id)),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Écoles" subtitle="Toutes les écoles inscrites sur iziecole." />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Établissement</TableHead>
            <TableHead>Abonnement</TableHead>
            <TableHead>Inscrite le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(schools ?? []).map((school, i) => {
            const status = statuses[i];
            return (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={status.active ? "bg-status-good/10 text-status-good" : "bg-status-critical/10 text-status-critical"}
                  >
                    {status.active ? `À jour (${status.daysRemaining} j.)` : "Expiré"}
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
