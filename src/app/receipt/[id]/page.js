import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AutoPrint } from "../auto-print";
import { PrintButton } from "@/components/layout/print-button";

const METHOD_LABELS = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  cheque: "Chèque",
  virement: "Virement",
};

function fcfa(amount) {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export default async function ReceiptPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, amount, method, receipt_number, paid_at, notes, schools(name, phone, address, logo_url), students(first_name, last_name, matricule), profiles(full_name), invoices(period_label)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!payment) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center bg-secondary/40 py-10 print:min-h-0 print:bg-white print:py-0">
      <AutoPrint />

      <div className="mb-4 print:hidden">
        <PrintButton label="Imprimer le reçu" />
      </div>

      <div className="w-[80mm] space-y-3 rounded-lg border bg-white p-4 text-[13px] leading-snug text-black shadow-sm print:w-full print:border-none print:shadow-none">
        <div className="flex flex-col items-center text-center">
          {payment.schools?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={payment.schools.logo_url} alt="" className="mb-1 h-12 w-12 object-contain" />
          ) : null}
          <p className="text-base font-bold">{payment.schools?.name}</p>
          {payment.schools?.address ? <p>{payment.schools.address}</p> : null}
          {payment.schools?.phone ? <p>{payment.schools.phone}</p> : null}
        </div>

        <div className="border-t border-dashed border-black/40" />

        <p className="text-center font-semibold">REÇU DE PAIEMENT</p>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>N° reçu</span>
            <span className="font-medium">{payment.receipt_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium">
              {new Date(payment.paid_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-black/40" />

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Élève</span>
            <span className="font-medium">
              {payment.students?.first_name} {payment.students?.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Matricule</span>
            <span className="font-medium">{payment.students?.matricule}</span>
          </div>
          {payment.invoices?.period_label ? (
            <div className="flex justify-between">
              <span>Période</span>
              <span className="font-medium">{payment.invoices.period_label}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-dashed border-black/40" />

        <div className="flex justify-between text-base font-bold">
          <span>Montant</span>
          <span>{fcfa(Number(payment.amount))}</span>
        </div>
        <div className="flex justify-between">
          <span>Mode de paiement</span>
          <span className="font-medium">{METHOD_LABELS[payment.method] ?? payment.method}</span>
        </div>
        <div className="flex justify-between">
          <span>Encaissé par</span>
          <span className="font-medium">{payment.profiles?.full_name ?? "—"}</span>
        </div>

        <div className="border-t border-dashed border-black/40" />

        <p className="text-center text-xs">Merci de votre confiance — iziecole</p>
      </div>
    </div>
  );
}
