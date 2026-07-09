"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

/** Palette per dataviz spec: categorical slot 1 (blue) & 2 (aqua); muted ink axes. */
const BLUE = "#2a78d6";
const AQUA = "#1baf7a";
const INK_MUTED = "#898781";
const GRID = "#e1e0d9";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export function FinTrendChart({ data }: { data: { fy: string; Revenue: number | null; PAT: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -14, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis dataKey="fy" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} unit="" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v} Cr`]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Bar dataKey="Revenue" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={34}>
          <LabelList dataKey="Revenue" position="top" style={{ fontSize: 10, fill: "#52514e" }} formatter={(v: React.ReactNode) => (v != null ? `₹${v}` : "")} />
        </Bar>
        <Bar dataKey="PAT" fill={AQUA} radius={[4, 4, 0, 0]} maxBarSize={34}>
          <LabelList dataKey="PAT" position="top" style={{ fontSize: 10, fill: "#52514e" }} formatter={(v: React.ReactNode) => (v != null ? `₹${v}` : "")} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

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

/** Peer multiple comparison — the issuer's bar uses slot-1 blue, peers use a light ramp step. */
export function PeerCompareChart({
  data, metricLabel,
}: { data: { name: string; value: number; self?: boolean }[]; metricLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: INK_MUTED }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}x`, metricLabel]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={38}>
          <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#52514e" }} formatter={(v: React.ReactNode) => `${v}x`} />
          {data.map((d, i) => (
            <Cell key={i} fill={d.self ? BLUE : "#9ec5f4"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
