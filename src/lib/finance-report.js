import { describePeriod, filterByPeriod } from "@/lib/period-filter";

export { METHOD_LABELS } from "@/lib/payment-methods";

// Everything the finance report (PDF page and Excel export) needs: every
// recette (payment) and dépense of the school inside the selected period,
// newest first, with totals. Reads go through the caller's session, so RLS
// still decides what the user may see.
export async function loadFinanceReport(supabase, schoolId, { period, from, to } = {}) {
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, paid_at, students(first_name, last_name, matricule)")
      .eq("school_id", schoolId)
      .order("paid_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, label, amount, expense_date, created_at")
      .eq("school_id", schoolId)
      .order("expense_date", { ascending: false }),
  ]);

  const filter = { period, from, to };
  const incomes = filterByPeriod(payments ?? [], (p) => p.paid_at, filter);
  const outgoings = filterByPeriod(expenses ?? [], (e) => e.expense_date, filter);

  const totalIncome = incomes.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = outgoings.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    payments: incomes,
    expenses: outgoings,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    periodLabel: describePeriod(period, from, to),
  };
}

export function studentFullName(payment) {
  return `${payment.students?.first_name ?? ""} ${payment.students?.last_name ?? ""}`.trim();
}
