"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Élèves inscrits",
    color: "var(--chart-1)",
  },
};

export function EffectifsChart({ data }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--color-count)" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
