"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PERIOD_OPTIONS } from "@/lib/period-filter";

export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "all";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParams(patch) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handlePeriodChange(value) {
    if (value === "all") {
      updateParams({ period: null, from: null, to: null });
    } else if (value === "custom") {
      updateParams({ period: "custom" });
    } else {
      updateParams({ period: value, from: null, to: null });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[190px] gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={from}
            onChange={(e) => updateParams({ from: e.target.value })}
            className="h-8 w-[150px]"
            aria-label="Date de début"
          />
          <span className="text-sm text-muted-foreground">→</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => updateParams({ to: e.target.value })}
            className="h-8 w-[150px]"
            aria-label="Date de fin"
          />
        </div>
      ) : null}
    </div>
  );
}
