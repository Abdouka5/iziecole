"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Both buttons open the browser's print dialog on the print-only document
// rendered by SchedulePrintDoc: "Imprimer" sends it to a printer, and
// "Télécharger" is the same dialog with "Enregistrer au format PDF" — a
// browser can't be told to skip straight to a PDF, so the tab title is set
// to a proper file name for the duration of the print instead (that's what
// the dialog suggests as the PDF's name).
export function PrintActions({ label, fileTitle }) {
  function openPrintDialog() {
    const previousTitle = document.title;
    document.title = fileTitle;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={openPrintDialog}>
          <Download className="mr-1.5 h-4 w-4" />
          Télécharger (PDF)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={openPrintDialog}>
          <Printer className="mr-1.5 h-4 w-4" />
          Imprimer
        </Button>
      </div>
    </div>
  );
}
