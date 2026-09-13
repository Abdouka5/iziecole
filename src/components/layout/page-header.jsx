import { cn } from "@/lib/utils";

// Shared page title block: 30-34px/700 title, 14-16px muted subtitle, and an
// optional right-aligned actions slot (buttons, selects...). Reused by every
// module page so the type scale stays consistent app-wide.
export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
