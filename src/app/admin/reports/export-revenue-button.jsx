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

export function ExportRevenueButton({ payments }) {
  function handleExportCsv() {
    const header = ["École", "Période", "Date", "Montant (FCFA)"];
    const rows = payments.map((p) => [p.schoolName, p.periodLabel, p.dateLabel, Math.round(p.amount)]);
    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(";")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenus-iziecole-${new Date().toISOString().slice(0, 10)}.csv`;
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
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href="/reports/platform-revenue" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
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
