import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PLAN_LABELS = {
  prescolaire: "Préscolaire",
  elementaire: "Élémentaire",
  college_lycee: "Collège au Lycée",
  ecole_complete: "École complète",
};

export default async function AdminSchoolsPage() {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, slug, subscription_plan, created_at")
    .order("created_at", { ascending: false });

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
            <TableHead>Inscrite le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(schools ?? []).map((school) => (
            <TableRow key={school.id}>
              <TableCell className="font-medium">{school.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {PLAN_LABELS[school.subscription_plan] ?? school.subscription_plan}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(school.created_at).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
