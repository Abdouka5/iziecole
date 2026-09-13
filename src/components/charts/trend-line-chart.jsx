"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Single-series cumulative trend line (e.g. schools registered over time).
export function TrendLineChart({ data, config, dataKey, xKey = "month" }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey={dataKey}
          type="monotone"
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          dot={{ r: 4, fill: `var(--color-${dataKey})` }}
        />
      </LineChart>
    </ChartContainer>
  );
}
