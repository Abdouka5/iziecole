import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Pastel bg / solid fg pairs, one per categorical chart slot (see globals.css
// --chart-1..5) — keep a stat card's accent in sync with that same category
// wherever it also appears in a chart.
export const ACCENTS = {
  blue: { bg: "#e8f1fa", fg: "#146ef5" },
  green: { bg: "#e7f6ec", fg: "#12b76a" },
  purple: { bg: "#f1ebfc", fg: "#7f56d9" },
  amber: { bg: "#fdf1e0", fg: "#f79009" },
  pink: { bg: "#fce8f1", fg: "#ec4899" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  trendDirection = "up",
  badge,
  accent = "blue",
  href,
}) {
  const { bg, fg } = ACCENTS[accent] ?? ACCENTS.blue;
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  const body = (
    <Card
      className="relative h-full overflow-hidden border-0"
      style={{ background: `linear-gradient(135deg, ${bg} 0%, var(--card) 75%)` }}
    >
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 opacity-[0.14]"
        style={{ color: fg }}
      />
      <CardContent className="relative flex h-full flex-col justify-center gap-1.5 p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: fg }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          {href ? <ChevronRight className="h-4 w-4 shrink-0 self-start text-muted-foreground" /> : null}
        </div>
        {badge ? (
          <Badge variant="secondary" className="w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            {badge}
          </Badge>
        ) : trend != null ? (
          <p
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trendDirection === "up" ? "text-emerald-600" : "text-red-600",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend}
            {trendLabel ? <span className="font-normal text-muted-foreground">{trendLabel}</span> : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
