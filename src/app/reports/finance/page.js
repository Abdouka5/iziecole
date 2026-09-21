import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { describePeriod } from "@/lib/period-filter";
import { loadFinanceReport, METHOD_LABELS, studentFullName } from "@/lib/finance-report";
import { AutoPrint } from "@/app/receipt/auto-print";
import { PrintButton } from "@/components/layout/print-button";

const TIME_ZONE = "Africa/Dakar";

const fcfa = (amount) => `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// The PDF's suggested file name comes from the page title.
export async function generateMetadata({ searchParams }) {
  const { period, from, to } = await searchParams;
  return { title: `Rapport financier - ${describePeriod(period, from, to).replace(/\//g, "-")}` };
}

const TH = "bg-[#0b1220] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-white";

export default async function FinanceReportPage({ searchParams }) {
  const { period, from, to } = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership?.school) redirect("/login");

  const { school } = membership;
  const supabase = await createClient();
  const { payments, expenses, totalIncome, totalExpenses, balance, periodLabel } = await loadFinanceReport(
    supabase,
    school.id,
    { period, from, to },
  );

  const editedOn = new Date().toLocaleDateString("fr-FR", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const contact = [school.address, school.phone].filter(Boolean).join("  ·  ");

  const kpis = [
    { label: "Total des recettes", value: fcfa(totalIncome), color: "#16a34a", note: `${payments.length} transaction${payments.length > 1 ? "s" : ""}` },
    { label: "Total des dépenses", value: fcfa(totalExpenses), color: "#f97316", note: `${expenses.length} transaction${expenses.length > 1 ? "s" : ""}` },
    { label: "Solde", value: fcfa(balance), color: balance < 0 ? "#dc2626" : "#1d4ed8", note: "Recettes − dépenses" },
  ];

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-[#0d1526] print:max-w-none print:p-[10mm]">
      <style>{`@media print { @page { size: A4; margin: 0; } }`}</style>
      <AutoPrint />

      <div className="mb-6 print:hidden">
        <PrintButton label="Télécharger en PDF" />
      </div>

      <header className="flex items-end justify-between gap-6 border-b-2 border-[#1d4ed8] pb-4">
        <div className="flex items-center gap-4">
          {school.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_url} alt="" className="h-14 w-14 rounded-lg object-contain" />
          ) : null}
          <div>
            <p className="text-[20px] font-extrabold leading-tight tracking-tight">{school.name}</p>
            {contact ? <p className="mt-0.5 text-[11px] text-[#5a6480]">{contact}</p> : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f97316]">Rapport financier</p>
          <p className="text-[18px] font-extrabold leading-tight tracking-tight text-[#1d4ed8]">{periodLabel}</p>
          <p className="text-[11px] text-[#5a6480]">Édité le {editedOn}</p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-[#e2e7f2] px-4 py-3"
            style={{ borderTopWidth: 3, borderTopColor: kpi.color }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#66708a]">{kpi.label}</p>
            <p className="mt-1 text-[18px] font-extrabold tracking-tight" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            <p className="mt-0.5 text-[10px] text-[#66708a]">{kpi.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-extrabold tracking-tight">Recettes</h2>
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#e2e7f2] text-[11px]">
          <thead>
            <tr>
              <th className={TH}>Date et heure</th>
              <th className={TH}>Élève</th>
              <th className={TH}>Matricule</th>
              <th className={TH}>Mode de paiement</th>
              <th className={`${TH} text-right`}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[#66708a]">
                  Aucune recette sur cette période.
                </td>
              </tr>
            ) : (
              payments.map((p, i) => (
                <tr key={p.id} className={`break-inside-avoid ${i % 2 === 1 ? "bg-[#f8faff]" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-[#39435c]">{formatDateTime(p.paid_at)}</td>
                  <td className="px-3 py-1.5 font-medium">{studentFullName(p)}</td>
                  <td className="px-3 py-1.5 text-[#66708a]">{p.students?.matricule ?? "—"}</td>
                  <td className="px-3 py-1.5">{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums">{fcfa(Number(p.amount))}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-right font-bold">
                Total des recettes
              </td>
              <td className="whitespace-nowrap border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-right font-extrabold tabular-nums text-[#16a34a]">
                {fcfa(totalIncome)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-extrabold tracking-tight">Dépenses</h2>
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#e2e7f2] text-[11px]">
          <thead>
            <tr>
              <th className={TH}>Date</th>
              <th className={TH}>Libellé</th>
              <th className={`${TH} text-right`}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-[#66708a]">
                  Aucune dépense sur cette période.
                </td>
              </tr>
            ) : (
              expenses.map((e, i) => (
                <tr key={e.id} className={`break-inside-avoid ${i % 2 === 1 ? "bg-[#f8faff]" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-[#39435c]">
                    {new Date(e.expense_date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-1.5 font-medium">{e.label}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums">{fcfa(Number(e.amount))}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-right font-bold">
                Total des dépenses
              </td>
              <td className="whitespace-nowrap border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-right font-extrabold tabular-nums text-[#f97316]">
                {fcfa(totalExpenses)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer className="mt-6 flex items-center justify-between border-t border-[#e2e7f2] pt-3 text-[10px] text-[#66708a]">
        <p>Solde de la période : {fcfa(balance)}</p>
        <div className="flex items-center gap-2">
          <span>Généré avec</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logologinpage.png" alt="iziecole" className="h-5 w-auto" />
        </div>
      </footer>
    </div>
  );
}
