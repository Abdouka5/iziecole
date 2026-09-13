import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  MapPin,
  User,
  Home,
  Users,
  BarChart3,
  Phone,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { calculateAge } from "@/lib/time";
import { PageHeader } from "@/components/layout/page-header";
import { PrintButton } from "@/components/layout/print-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

const STATUS_LABELS = {
  active: "Élève actif",
  transferred: "Transféré",
  graduated: "Diplômé",
  withdrawn: "Retiré",
};

const STATUS_DOT = {
  active: { dot: "bg-status-good", text: "text-status-good" },
  transferred: { dot: "bg-status-warning", text: "text-status-warning" },
  graduated: { dot: "bg-primary", text: "text-primary" },
  withdrawn: { dot: "bg-status-critical", text: "text-status-critical" },
};

function SectionTitle({ children }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className="h-4 w-1.5 rounded-full bg-amber-400" />
      <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{children}</h2>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0">
      <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function guardianTone(relationship, index) {
  const r = (relationship ?? "").toLowerCase();
  if (r.includes("mère") || r.includes("maman")) return "pink";
  if (r.includes("père") || r.includes("papa")) return "blue";
  return index % 2 === 0 ? "blue" : "pink";
}

function GuardianCard({ guardian, tone }) {
  const palette =
    tone === "pink"
      ? { bg: "bg-pink-50", iconBg: "bg-pink-500" }
      : { bg: "bg-blue-50", iconBg: "bg-primary" };

  return (
    <div className={cn("flex items-start gap-3 rounded-xl p-4", palette.bg)}>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white", palette.iconBg)}>
        <User className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {guardian.relationship ?? "Responsable"}
          {guardian.is_primary ? " (principal)" : ""}
        </p>
        <p className="truncate font-semibold text-foreground">{guardian.full_name}</p>
        {guardian.phone ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {guardian.phone}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default async function StudentDetailPage({ params }) {
  const { id } = await params;
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const [{ data: student }, { data: currentYear }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, first_name, last_name, matricule, birth_date, birth_place, gender, address, status, created_at, enrollments(classes(name, levels(name, cycle)))",
      )
      .eq("id", id)
      .eq("school_id", membership.school.id)
      .maybeSingle(),
    supabase
      .from("school_years")
      .select("label")
      .eq("school_id", membership.school.id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (!student) notFound();

  const { data: guardians } = await supabase
    .from("guardians")
    .select("id, full_name, phone, relationship, is_primary")
    .eq("student_id", id)
    .order("is_primary", { ascending: false });

  const klass = student.enrollments?.[0]?.classes ?? null;
  const age = calculateAge(student.birth_date);
  const statusDot = STATUS_DOT[student.status] ?? STATUS_DOT.active;

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

      <div className="flex items-start justify-between gap-4 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 print:rounded-none print:ring-0">
        <div className="flex items-center gap-3 p-6">
          {membership.school.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={membership.school.logo_url} alt="" className="h-14 w-14 rounded-xl object-contain" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-7 w-7" />
            </span>
          )}
          <p className="text-xl font-extrabold tracking-tight text-foreground">{membership.school.name}</p>
        </div>
        <div
          className="flex h-full shrink-0 flex-col justify-center gap-1.5 bg-[#0f1b3d] px-8 py-6 text-right"
          style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
        >
          <p className="text-lg font-extrabold uppercase tracking-wide text-white">Fiche élève</p>
          <p className="text-[11px] font-medium uppercase tracking-widest text-white/60">
            Année scolaire {currentYear?.label ?? "—"}
          </p>
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="p-6">
          <SectionTitle>Informations de l&apos;élève</SectionTitle>

          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {student.first_name} {student.last_name}
              </p>
              <span className={cn("mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium", statusDot.text)}>
                <span className={cn("h-2 w-2 rounded-full", statusDot.dot)} />
                {STATUS_LABELS[student.status] ?? student.status}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-white">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Matricule</p>
                <p className="font-bold text-foreground">{student.matricule}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <InfoRow
                icon={Calendar}
                label="Date de naissance"
                value={
                  student.birth_date
                    ? `${new Date(student.birth_date).toLocaleDateString("fr-FR")} (${age} ans)`
                    : null
                }
              />
              <InfoRow icon={MapPin} label="Lieu de naissance" value={student.birth_place} />
              <InfoRow icon={User} label="Genre" value={student.gender === "M" ? "Garçon" : student.gender === "F" ? "Fille" : null} />
              <InfoRow icon={Home} label="Adresse" value={student.address} />
            </div>
            <div>
              <InfoRow icon={Users} label="Classe" value={klass?.name} />
              <InfoRow icon={BarChart3} label="Niveau" value={klass?.levels?.cycle ? CYCLE_LABELS[klass.levels.cycle] : null} />
              <InfoRow icon={Calendar} label="Inscrit le" value={new Date(student.created_at).toLocaleDateString("fr-FR")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="p-6">
          <SectionTitle>Parents / Responsables</SectionTitle>
          {(guardians ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun parent/responsable renseigné.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {guardians.map((g, i) => (
                <GuardianCard key={g.id} guardian={g} tone={guardianTone(g.relationship, i)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="p-6">
          <SectionTitle>Informations complémentaires</SectionTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5" />
            </span>
            <p className="italic">Aucune information complémentaire pour le moment.</p>
          </div>
        </CardContent>
      </Card>

      {membership.school.address || membership.school.phone ? (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t pt-4 text-xs text-muted-foreground print:pt-3">
          {membership.school.address ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {membership.school.address}
            </span>
          ) : null}
          {membership.school.phone ? (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {membership.school.phone}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
