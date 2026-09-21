import { NextResponse } from "next/server";
import writeExcelFile from "write-excel-file/node";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { loadFinanceReport } from "@/lib/finance-report";
import { buildFinanceWorkbook } from "@/lib/finance-workbook";

export const dynamic = "force-dynamic";

// Excel export of every recette and dépense in the selected period
// (?period=&from=&to=, same params as the Finances page filter).
export async function GET(request) {
  const membership = await getCurrentMembership();
  if (!membership?.school) return new NextResponse("Non autorisé", { status: 401 });

  const url = new URL(request.url);
  const supabase = await createClient();
  const report = await loadFinanceReport(supabase, membership.school.id, {
    period: url.searchParams.get("period") ?? "all",
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const now = new Date();
  const sheets = buildFinanceWorkbook({
    schoolName: membership.school.name,
    editedOn: now.toLocaleDateString("fr-FR", { timeZone: "Africa/Dakar", day: "numeric", month: "long", year: "numeric" }),
    report,
  });
  const buffer = await writeExcelFile(sheets).toBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Rapport-financier-${now.toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
