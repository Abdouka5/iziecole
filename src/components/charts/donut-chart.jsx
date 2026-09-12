"use client";

import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// Generic donut: data = [{ name, value, fill }], config = shadcn chart config
// keyed by `name`. Pass centerValue/centerLabel to overlay a total, like the
// "248 élèves" in the middle of the level-distribution donut.
export function DonutChart({ data, config, centerValue, centerLabel, className }) {
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[240px]", className)}>
      <ChartContainer config={config} className="mx-auto aspect-square h-full w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="100%"
            strokeWidth={2}
            stroke="var(--card)"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      {centerValue != null ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-heading font-bold text-brand-ink">{centerValue}</span>
          {centerLabel ? (
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
