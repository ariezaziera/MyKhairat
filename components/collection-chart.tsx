"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CollectionChart({ data }: { data: { label: string; expected: number; collected: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [`RM ${Number(value ?? 0).toFixed(2)}`, ""]} />
          <Legend />
          <Bar dataKey="expected" name="Expected" fill="#007BFF" radius={[6, 6, 0, 0]} />
          <Bar dataKey="collected" name="Collected" fill="#28A745" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
