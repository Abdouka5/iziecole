import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { AutoPrint } from "@/app/receipt/auto-print";
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

export default async function FinancePaymentsReportPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, paid_at, students(first_name, last_name, matricule)")
    .eq("school_id", membership.school.id)
    .order("paid_at", { ascending: false });

  const total = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-black print:max-w-none print:p-0">
      <AutoPrint />

      <div className="print:hidden">
        <PrintButton label="Télécharger en PDF" />
      </div>

      <div className="flex items-center gap-3 border-b border-black/10 pb-4">
        {membership.school.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={membership.school.logo_url} alt="" className="h-12 w-12 object-contain" />
        ) : null}
        <div>
          <p className="text-lg font-bold">{membership.school.name}</p>
          <p className="text-sm text-black/60">
            Rapport des paiements — édité le {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-2 pr-2 font-semibold">Élève</th>
            <th className="py-2 pr-2 font-semibold">Matricule</th>
            <th className="py-2 pr-2 font-semibold">Mode de paiement</th>
            <th className="py-2 pr-2 font-semibold">Date</th>
            <th className="py-2 pl-2 text-right font-semibold">Montant</th>
          </tr>
        </thead>
        <tbody>
          {(payments ?? []).length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-black/50">
                Aucun paiement enregistré.
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id} className="border-b border-black/10">
                <td className="py-2 pr-2">
                  {p.students?.first_name} {p.students?.last_name}
                </td>
                <td className="py-2 pr-2 text-black/60">{p.students?.matricule ?? "—"}</td>
                <td className="py-2 pr-2">{METHOD_LABELS[p.method] ?? p.method}</td>
                <td className="py-2 pr-2 text-black/60">{new Date(p.paid_at).toLocaleDateString("fr-FR")}</td>
                <td className="py-2 pl-2 text-right font-medium">{fcfa(Number(p.amount))}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="py-3 text-right font-semibold">
              Total encaissé
            </td>
            <td className="py-3 pl-2 text-right text-base font-bold">{fcfa(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
