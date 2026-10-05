import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AutoPrint } from "@/app/receipt/auto-print";
import { PrintButton } from "@/components/layout/print-button";

const TYPE_LABELS = { absence: "BILLET D'ABSENCE", retard: "BILLET DE RETARD" };

export default async function AttendanceTicketPage({ params, searchParams }) {
  const { id } = await params;
  const { download } = await searchParams;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("attendance_records")
    .select(
      "id, type, occurred_on, reason, justified, created_at, schools(name, phone, address, logo_url), students(first_name, last_name, matricule), classes(name), profiles(full_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!record) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center bg-secondary/40 py-10 print:min-h-0 print:bg-white print:py-0">
      {download === "1" ? null : <AutoPrint />}

      <div className="mb-4 print:hidden">
        <PrintButton label="Imprimer le billet" />
      </div>

      <div className="w-[80mm] space-y-3 rounded-lg border bg-white p-4 text-[13px] leading-snug text-black shadow-sm print:w-full print:border-none print:shadow-none">
        <div className="flex flex-col items-center text-center">
          {record.schools?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.schools.logo_url} alt="" className="mb-1 h-12 w-12 object-contain" />
          ) : null}
          <p className="text-base font-bold">{record.schools?.name}</p>
          {record.schools?.address ? <p>{record.schools.address}</p> : null}
          {record.schools?.phone ? <p>{record.schools.phone}</p> : null}
        </div>

        <div className="border-t border-dashed border-black/40" />

        <p className="text-center font-semibold">{TYPE_LABELS[record.type] ?? "BILLET"}</p>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium">{new Date(record.occurred_on).toLocaleDateString("fr-FR")}</span>
          </div>
          <div className="flex justify-between">
            <span>Émis le</span>
            <span className="font-medium">
              {new Date(record.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-black/40" />

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Élève</span>
            <span className="font-medium">
              {record.students?.first_name} {record.students?.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Matricule</span>
            <span className="font-medium">{record.students?.matricule}</span>
          </div>
          <div className="flex justify-between">
            <span>Classe</span>
            <span className="font-medium">{record.classes?.name ?? "—"}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black/40" />

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Raison</span>
            <span className="font-medium text-right">{record.reason ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Justifié</span>
            <span className="font-medium">{record.justified ? "Oui" : "Non"}</span>
          </div>
          <div className="flex justify-between">
            <span>Enregistré par</span>
            <span className="font-medium">{record.profiles?.full_name ?? "—"}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black/40" />

        <p className="text-center text-xs">
          À faire signer par le parent/tuteur et remettre à la surveillance.
        </p>
        <div className="mt-4 border-t border-black/60 pt-1 text-center text-xs">Signature</div>
      </div>
    </div>
  );
}
