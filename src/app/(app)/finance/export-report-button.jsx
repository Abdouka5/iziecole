"use client";

import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function toCsvValue(value) {
  const str = String(value ?? "");
  return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function ExportReportButton({ payments }) {
  function handleExportCsv() {
    const header = ["Élève", "Matricule", "Mode de paiement", "Date", "Montant (FCFA)"];
    const rows = payments.map((p) => [p.studentName, p.matricule, p.methodLabel, p.dateLabel, Math.round(p.amount)]);
    // Semicolon-separated + UTF-8 BOM so accented headers/names display
    // correctly when opened directly in Excel with a French locale.
    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(";")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paiements-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-1.5 h-4 w-4" />
          Exporter le rapport
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href="/reports/finance-payments" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Télécharger en PDF
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCsv} className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Télécharger en Excel (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
