"use client";

import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

/** Palette per dataviz spec: categorical slot 1 (blue); muted ink axes. */
const BLUE = "#2a78d6";
const INK_MUTED = "#898781";
const GRID = "#e1e0d9";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export function CategoryScoreChart({ data }: { data: { category: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 40, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 11, fill: "#52514e" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}/100`, "Score"]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="score" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList dataKey="score" position="right" style={{ fontSize: 11, fill: "#52514e" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
