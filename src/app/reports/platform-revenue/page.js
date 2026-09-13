import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { formatFcfa } from "@/lib/subscription-plans";
import { AutoPrint } from "@/app/receipt/auto-print";
import { PrintButton } from "@/components/layout/print-button";

export default async function PlatformRevenueReportPage() {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "super_admin") redirect("/login");

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("id, amount, status, period_label, paid_at, schools(name)")
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  const total = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-black print:max-w-none print:p-0">
      <AutoPrint />
      <div className="print:hidden">
        <PrintButton label="Télécharger en PDF" />
      </div>

      <div className="border-b border-black/10 pb-4">
        <p className="text-lg font-bold">iziecole — Rapport des revenus</p>
        <p className="text-sm text-black/60">Édité le {new Date().toLocaleDateString("fr-FR")}</p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-2 pr-2 font-semibold">École</th>
            <th className="py-2 pr-2 font-semibold">Période</th>
            <th className="py-2 pr-2 font-semibold">Date</th>
            <th className="py-2 pl-2 text-right font-semibold">Montant</th>
          </tr>
        </thead>
        <tbody>
          {(payments ?? []).length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-black/50">
                Aucun paiement enregistré.
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id} className="border-b border-black/10">
                <td className="py-2 pr-2">{p.schools?.name ?? "—"}</td>
                <td className="py-2 pr-2 text-black/60">{p.period_label}</td>
                <td className="py-2 pr-2 text-black/60">{new Date(p.paid_at).toLocaleDateString("fr-FR")}</td>
                <td className="py-2 pl-2 text-right font-medium">{formatFcfa(Number(p.amount))}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-3 text-right font-semibold">
              Total
            </td>
            <td className="py-3 pl-2 text-right text-base font-bold">{formatFcfa(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
