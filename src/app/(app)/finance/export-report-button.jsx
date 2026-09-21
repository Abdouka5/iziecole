"use client";

import { useSearchParams } from "next/navigation";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Both exports cover every recette and dépense in the period currently
// selected in the page filter, so the filter's query params are forwarded.
export function ExportReportButton({ periodLabel }) {
  const searchParams = useSearchParams();
  const forwarded = new URLSearchParams();
  for (const key of ["period", "from", "to"]) {
    const value = searchParams.get(key);
    if (value) forwarded.set(key, value);
  }
  const query = forwarded.toString() ? `?${forwarded.toString()}` : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-1.5 h-4 w-4" />
          Exporter le rapport
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Recettes et dépenses — {periodLabel}
        </p>
        <DropdownMenuItem asChild>
          <a href={`/reports/finance${query}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/reports/finance/xlsx${query}`} download className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx)
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
