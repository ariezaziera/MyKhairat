"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CollectionChart({
  data,
}: {
  data: { label: string; expected: number; collected: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid stroke="#eef2f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            label={{ value: "RM", position: "insideTopLeft", offset: -8 }}
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [
              `RM ${Number(value ?? 0).toFixed(2)}`,
              String(name),
            ]}
          />
          <Legend />
          <Bar
            dataKey="expected"
            name="Jangkaan"
            fill="#1D4ED8"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="collected"
            name="Diterima"
            fill="#15803D"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
