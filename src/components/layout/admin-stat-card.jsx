import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Bolder, fully-saturated gradient cards for the Super Admin console —
// deliberately more "premium SaaS" than the pastel StatCard used in the
// school-facing app, to visually separate the two consoles.
export const ADMIN_ACCENTS = {
  blue: "from-[#1d6fe0] to-[#4c8ef7]",
  green: "from-[#0f9d58] to-[#22c55e]",
  purple: "from-[#7c3aed] to-[#a855f7]",
  orange: "from-[#e08600] to-[#f5a623]",
};

export function AdminStatCard({ icon: Icon, label, value, trend, trendDirection = "up", accent = "blue" }) {
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm", ADMIN_ACCENTS[accent])}>
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Icon className="h-5 w-5" />
        </span>
        {trend ? (
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
            <TrendIcon className="h-3 w-3" />
            {trend}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-white/80">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {trend ? <p className="text-xs text-white/60">vs période précédente</p> : null}
    </div>
  );
}
