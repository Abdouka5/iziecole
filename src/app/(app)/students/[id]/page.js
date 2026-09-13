import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { calculateAge } from "@/lib/time";
import { PageHeader } from "@/components/layout/page-header";
import { PrintButton } from "@/components/layout/print-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

const STATUS_LABELS = {
  active: "Actif",
  transferred: "Transféré",
  graduated: "Diplômé",
  withdrawn: "Retiré",
};

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0 print:border-b print:py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

export default async function StudentDetailPage({ params }) {
  const { id } = await params;
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, first_name, last_name, matricule, birth_date, birth_place, gender, address, status, created_at, enrollments(classes(name, levels(name, cycle)))",
    )
    .eq("id", id)
    .eq("school_id", membership.school.id)
    .maybeSingle();

  if (!student) notFound();

  const { data: guardians } = await supabase
    .from("guardians")
    .select("id, full_name, phone, relationship, is_primary")
    .eq("student_id", id)
    .order("is_primary", { ascending: false });

  const klass = student.enrollments?.[0]?.classes ?? null;
  const age = calculateAge(student.birth_date);

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="print:hidden">
        <PageHeader
          title={`${student.first_name} ${student.last_name}`}
          subtitle={`Matricule ${student.matricule}`}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/students">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Retour
                </Link>
              </Button>
              <PrintButton label="Télécharger la fiche en PDF" />
            </>
          }
        />
      </div>

      <div className="hidden flex-col items-center text-center print:flex">
        {membership.school.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={membership.school.logo_url} alt="" className="mb-2 h-14 w-14 object-contain" />
        ) : null}
        <p className="text-lg font-bold">{membership.school.name}</p>
        <p className="text-sm text-muted-foreground">Fiche élève</p>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            {student.first_name} {student.last_name}
            <Badge variant="secondary">{STATUS_LABELS[student.status] ?? student.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Matricule" value={student.matricule} />
          <InfoRow
            label="Date de naissance"
            value={
              student.birth_date
                ? `${new Date(student.birth_date).toLocaleDateString("fr-FR")} (${age} ans)`
                : null
            }
          />
          <InfoRow label="Lieu de naissance" value={student.birth_place} />
          <InfoRow label="Genre" value={student.gender === "M" ? "Garçon" : student.gender === "F" ? "Fille" : null} />
          <InfoRow label="Adresse" value={student.address} />
          <InfoRow label="Classe" value={klass?.name} />
          <InfoRow label="Niveau" value={klass?.levels?.cycle ? CYCLE_LABELS[klass.levels.cycle] : null} />
          <InfoRow label="Inscrit le" value={new Date(student.created_at).toLocaleDateString("fr-FR")} />
        </CardContent>
      </Card>

      <Card className="print:border-none print:shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Parents / Responsables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(guardians ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun parent/responsable renseigné.</p>
          ) : (
            guardians.map((g) => (
              <InfoRow
                key={g.id}
                label={`${g.relationship ?? "Responsable"}${g.is_primary ? " (principal)" : ""}`}
                value={[g.full_name, g.phone].filter(Boolean).join(" — ")}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
