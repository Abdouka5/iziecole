import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { loadReportCardData, frLongDate } from "@/lib/report-card";
import { PrintButton } from "@/components/layout/print-button";
import { Button } from "@/components/ui/button";
import { ReportCardDocument } from "../../report-card-document";

export async function generateMetadata({ params }) {
  const { studentId, termId } = await params;
  const supabase = await createClient();
  const membership = await getCurrentMembership();
  if (!membership?.school) return { title: "Bulletin de notes" };

  const data = await loadReportCardData(supabase, { schoolId: membership.school.id, studentId, termId });
  if (!data) return { title: "Bulletin de notes" };

  const name = `${data.student.first_name ?? ""} ${data.student.last_name ?? ""}`.trim();
  return { title: `BULLETIN - ${name} - ${data.termLabel}` };
}

export default async function ReportCardPage({ params }) {
  const { studentId, termId } = await params;
  const membership = await getCurrentMembership();
  if (!membership?.school) redirect("/login");

  const supabase = await createClient();
  const data = await loadReportCardData(supabase, { schoolId: membership.school.id, studentId, termId });
  if (!data) notFound();

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

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-none print:shadow-none">
        <ReportCardDocument school={membership.school} data={data} editedOn={editedOn} />
      </div>
    </div>
  );
}
