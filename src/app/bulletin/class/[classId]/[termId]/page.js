import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { loadReportCardData, loadClassRosterForTerm, frLongDate, termOrdinalLabel } from "@/lib/report-card";
import { PrintButton } from "@/components/layout/print-button";
import { Button } from "@/components/ui/button";
import { ReportCardDocument } from "../../../report-card-document";

export async function generateMetadata({ params }) {
  const { classId, termId } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("name").eq("id", classId).maybeSingle();
  const { data: term } = await supabase.from("terms").select("sequence").eq("id", termId).maybeSingle();
  return {
    title: `BULLETINS - ${cls?.name ?? "Classe"} - ${term ? termOrdinalLabel(term.sequence) : ""}`.trim(),
  };
}

// Every active student in the class gets their own bulletin, one per
// printed page (break-after-page) — the per-student math (average, rank,
// absences) is identical to the single-bulletin route, just looped.
export default async function ClassReportCardsPage({ params }) {
  const { classId, termId } = await params;
  const membership = await getCurrentMembership();
  if (!membership?.school) redirect("/login");

  const supabase = await createClient();
  const schoolId = membership.school.id;

  const { data: term } = await supabase
    .from("terms")
    .select("id, school_year_id")
    .eq("id", termId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!term) notFound();

  const roster = await loadClassRosterForTerm(supabase, { schoolId, classId, schoolYearId: term.school_year_id });
  if (roster.length === 0) notFound();

  const bulletins = await Promise.all(
    roster.map((s) => loadReportCardData(supabase, { schoolId, studentId: s.id, termId })),
  );
  const editedOn = frLongDate(new Date().toISOString());

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-secondary/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <div className="flex items-center gap-2 print:hidden">
        <PrintButton label="Télécharger PDF" />
        <PrintButton label="Imprimer" className="border-primary text-primary" />
        <Button variant="ghost" asChild>
          <Link href="/grades">
            <X className="mr-1.5 h-4 w-4" />
            Fermer
          </Link>
        </Button>
      </div>

      <div className="space-y-6 print:space-y-0">
        {bulletins.map((data, i) =>
          data ? (
            <div
              key={roster[i].id}
              className="overflow-x-auto rounded-xl border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-none print:shadow-none"
              style={i < bulletins.length - 1 ? { breakAfter: "page" } : undefined}
            >
              <ReportCardDocument school={membership.school} data={data} editedOn={editedOn} />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
