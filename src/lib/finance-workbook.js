import { METHOD_LABELS } from "./payment-methods.js";

const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#0b1220", textColor: "#ffffff" };
const header = (labels) => labels.map((value) => ({ value, ...HEADER_STYLE }));
const money = (value, style = {}) => ({ value: Math.round(value), type: Number, format: "#,##0", ...style });
const bold = { fontWeight: "bold" };

const fullName = (payment) =>
  `${payment.students?.first_name ?? ""} ${payment.students?.last_name ?? ""}`.trim();

// Sheets for write-excel-file: a summary, every recette and every dépense.
// Pure (no I/O) so it can be built and checked without a request.
export function buildFinanceWorkbook({ schoolName, editedOn, report }) {
  const { payments, expenses, totalIncome, totalExpenses, balance, periodLabel } = report;

  const summary = [
    [{ value: `Rapport financier — ${schoolName}`, fontWeight: "bold", fontSize: 14 }],
    [null],
    ["Période", periodLabel],
    ["Édité le", editedOn],
    [null],
    header(["Indicateur", "Montant (FCFA)"]),
    ["Total des recettes", money(totalIncome)],
    ["Total des dépenses", money(totalExpenses)],
    [{ value: "Solde", ...bold }, money(balance, bold)],
    [null],
    ["Nombre de recettes", { value: payments.length, type: Number }],
    ["Nombre de dépenses", { value: expenses.length, type: Number }],
  ];

  const incomeRows = payments.map((p) => [
    { value: new Date(p.paid_at), type: Date, format: "dd/mm/yyyy hh:mm" },
    fullName(p),
    p.students?.matricule ?? "",
    METHOD_LABELS[p.method] ?? p.method,
    money(Number(p.amount)),
  ]);
  const incomeSheet = [
    header(["Date et heure", "Élève", "Matricule", "Mode de paiement", "Montant (FCFA)"]),
    ...incomeRows,
    [{ value: "Total des recettes", ...bold }, null, null, null, money(totalIncome, bold)],
  ];

  const expenseRows = expenses.map((e) => [
    { value: new Date(e.expense_date), type: Date, format: "dd/mm/yyyy" },
    e.label,
    money(Number(e.amount)),
  ]);
  const expenseSheet = [
    header(["Date", "Libellé", "Montant (FCFA)"]),
    ...expenseRows,
    [{ value: "Total des dépenses", ...bold }, null, money(totalExpenses, bold)],
  ];

  return [
    { data: summary, sheet: "Synthèse", columns: [{ width: 30 }, { width: 44 }], showGridLines: false },
    {
      data: incomeSheet,
      sheet: "Recettes",
      columns: [{ width: 20 }, { width: 28 }, { width: 16 }, { width: 20 }, { width: 18 }],
      stickyRowsCount: 1,
    },
    {
      data: expenseSheet,
      sheet: "Dépenses",
      columns: [{ width: 16 }, { width: 44 }, { width: 18 }],
      stickyRowsCount: 1,
    },
  ];
}
