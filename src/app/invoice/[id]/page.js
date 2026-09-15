import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/layout/print-button";
import { formatFcfa } from "@/lib/subscription-plans";

const STATUS_LABELS = {
  pending: "En attente",
  paid: "Payée",
  failed: "Échouée",
  cancelled: "Annulée",
};

// "15 sept. 2026 – 15 oct. 2026" reads like a repeated date at a glance —
// spell out which end is which so it's unambiguously a range.
function formatPeriod(label) {
  const [start, end] = (label ?? "").split(" – ");
  return start && end ? `Du ${start} au ${end}` : label;
}

function capitalize(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("subscription_payments")
    .select("created_at, paid_at")
    .eq("id", id)
    .maybeSingle();

  const date = new Date(payment?.paid_at ?? payment?.created_at ?? Date.now());
  const month = capitalize(date.toLocaleDateString("fr-FR", { month: "long" }));

  return { title: `FACTURE ABONNEMENTS - ${month}` };
}

export default async function SubscriptionInvoicePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("subscription_payments")
    .select("id, amount, period_label, status, created_at, paid_at, schools(name, address, phone)")
    .eq("id", id)
    .maybeSingle();

  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 print:p-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold">Facture d&apos;abonnement</h1>
          <p className="text-sm text-muted-foreground">iziecole</p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-2xl border bg-white p-8 print:border-none">
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logologinpage.png" alt="iziecole" className="h-10 w-auto" />
            <p className="mt-2 text-sm text-muted-foreground">La gestion scolaire, simplifiée</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Facture N°</p>
            <p className="font-mono text-sm font-medium">{payment.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b py-6 text-sm">
          <div>
            <p className="text-muted-foreground">Facturé à</p>
            <p className="font-medium">{payment.schools?.name}</p>
            {payment.schools?.address ? <p>{payment.schools.address}</p> : null}
            {payment.schools?.phone ? <p>{payment.schools.phone}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">
              {new Date(payment.paid_at ?? payment.created_at).toLocaleDateString("fr-FR")}
            </p>
            <p className="mt-2 text-muted-foreground">Statut</p>
            <p className="font-medium">{STATUS_LABELS[payment.status] ?? payment.status}</p>
          </div>
        </div>

        <table className="w-full py-6 text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">
                Abonnement iziecole
                <br />
                <span className="text-xs text-muted-foreground">{formatPeriod(payment.period_label)}</span>
              </td>
              <td className="py-3 text-right">{formatFcfa(Number(payment.amount))}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right font-semibold">Total</td>
              <td className="pt-4 text-right text-lg font-bold">{formatFcfa(Number(payment.amount))}</td>
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-end pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cachetizi.png" alt="Cachet iziecole" className="h-24 w-24" />
        </div>

        <p className="border-t pt-6 text-center text-xs text-muted-foreground">Merci de votre confiance — iziecole</p>
      </div>
    </div>
  );
}
