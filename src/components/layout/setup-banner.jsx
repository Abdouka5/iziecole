import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SetupBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-status-warning/10 px-6 py-2.5 print:hidden">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" />
        Complétez les informations de votre établissement avant de commencer.
      </div>
      <Button size="sm" asChild>
        <Link href="/settings?section=general">Configurer maintenant</Link>
      </Button>
    </div>
  );
}
