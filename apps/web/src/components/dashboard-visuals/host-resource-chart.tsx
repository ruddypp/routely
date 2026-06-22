"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { HostResourceSample } from "./types";

export function HostResourceChart({ cpuLabel, emptyReason, memoryLabel, samples }: { cpuLabel: string; emptyReason?: string | null; memoryLabel: string; samples: HostResourceSample[] }) {
  const hasChartData = samples.length >= 2 && samples.some((sample) => sample.cpu != null || sample.memory != null);

  return (
    <section className="rounded-[22px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]" aria-labelledby="host-resource-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A8B3AD]">Host resources</p>
          <h2 id="host-resource-chart-title" className="mt-1 text-base font-black text-[#F7FFF9]">CPU / RAM</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-right text-xs">
          <SummaryPill label="CPU" value={cpuLabel} color={ROUTELY_CHART_COLORS.routeBlue} />
          <SummaryPill label="RAM" value={memoryLabel} color={ROUTELY_CHART_COLORS.routelyGreen} />
        </div>
      </div>

      <div className="mt-3 h-36 rounded-[18px] border border-[#2D352F] bg-[#101412] p-2" role="img" aria-label={`CPU ${cpuLabel}; RAM ${memoryLabel}`}>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={samples} margin={{ bottom: 0, left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="routelyCpu" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={ROUTELY_CHART_COLORS.routeBlue} stopOpacity={0.36} />
                  <stop offset="95%" stopColor={ROUTELY_CHART_COLORS.routeBlue} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="routelyMemory" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={ROUTELY_CHART_COLORS.routelyGreen} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROUTELY_CHART_COLORS.routelyGreen} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ROUTELY_CHART_COLORS.softBorder} strokeDasharray="3 7" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: ROUTELY_CHART_COLORS.mutedText, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis width={34} domain={[0, 100]} tick={{ fill: ROUTELY_CHART_COLORS.mutedText, fontSize: 10 }} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: ROUTELY_CHART_COLORS.routeBlue, strokeOpacity: 0.25 }}
                contentStyle={{ background: ROUTELY_CHART_COLORS.elevatedCharcoal, border: `1px solid ${ROUTELY_CHART_COLORS.softBorder}`, borderRadius: 14, color: ROUTELY_CHART_COLORS.primaryText }}
                labelStyle={{ color: ROUTELY_CHART_COLORS.mutedText }}
                formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, name === "cpu" ? "CPU" : "RAM"]}
              />
              <Area type="monotone" dataKey="memory" name="RAM" stroke={ROUTELY_CHART_COLORS.routelyGreen} strokeWidth={2.5} fill="url(#routelyMemory)" connectNulls />
              <Area type="monotone" dataKey="cpu" name="CPU" stroke={ROUTELY_CHART_COLORS.routeBlue} strokeWidth={2.5} fill="url(#routelyCpu)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState title="No trend yet" detail={emptyReason || "Current CPU/RAM values appear when the backend reports samples."} />
        )}
      </div>
    </section>
  );
}

function SummaryPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#A8B3AD]">{label}</span>
      <span className="ml-2 font-mono text-xs font-black text-[#F7FFF9]"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: color }} />{value}</span>
    </div>
  );
}

function ChartEmptyState({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#2D352F] px-3 text-center">
      <div>
        <p className="text-xs font-black text-[#F7FFF9]">{title}</p>
        <p className="mt-1 max-w-xs text-[11px] leading-4 text-[#A8B3AD]">{detail}</p>
      </div>
    </div>
  );
}
