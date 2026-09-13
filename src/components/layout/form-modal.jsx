"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Shared shell for every "open as a popup" form: header and footer stay
// pinned, only the field area in between scrolls. `closeHref` is where the
// URL goes when the user dismisses it (X, overlay, Escape) — the page that
// renders <FormModal open={Boolean(searchParams.new)} .../> re-renders
// closed once that param is gone, and a successful submit's server action
// redirects there too, so this component needs no submit-tracking state.
export function FormModal({ open, closeHref, title, description, footer, className, children }) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) router.push(closeHref);
      }}
    >
      <DialogContent className={cn("flex max-h-[85vh] flex-col sm:max-w-lg", className)}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="-mx-4 flex-1 overflow-y-auto px-4 py-1">{children}</div>
        {footer ? <DialogFooter className="shrink-0">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
