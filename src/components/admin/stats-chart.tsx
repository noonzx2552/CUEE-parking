"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StatsChart({
  data,
}: {
  data: Array<{ zone: string; total: number; reserved: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="zone" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#94a3b8" radius={[8, 8, 0, 0]} />
          <Bar dataKey="reserved" fill="#0284c7" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
