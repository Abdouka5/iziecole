"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Télécharger en PDF", className }) {
  return (
    <Button type="button" variant="outline" className={className} onClick={() => window.print()}>
      <Printer className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}
