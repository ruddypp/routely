"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { HostResourceSample } from "./types";

export function HostResourceChart({ cpuLabel, emptyReason, memoryLabel, samples }: { cpuLabel: string; emptyReason?: string | null; memoryLabel: string; samples: HostResourceSample[] }) {
  const hasChartData = samples.length >= 2 && samples.some((sample) => sample.cpu != null || sample.memory != null);

  return (
    <section className="rounded-[1.35rem] border border-[#DCE3EE] bg-white p-4 shadow-[0_24px_70px_rgba(23,32,51,0.08)]" aria-labelledby="host-resource-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Host resources</p>
          <h2 id="host-resource-chart-title" className="mt-1 text-lg font-black text-[#172033]">CPU / RAM samples</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs">
          <SummaryPill label="CPU" value={cpuLabel} color={ROUTELY_CHART_COLORS.routeBlue} />
          <SummaryPill label="RAM" value={memoryLabel} color={ROUTELY_CHART_COLORS.runningGreen} />
        </div>
      </div>

      <div className="mt-4 h-48 rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB] p-3" role="img" aria-label={`CPU ${cpuLabel}; RAM ${memoryLabel}`}>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={samples} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="routelyCpu" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={ROUTELY_CHART_COLORS.routeBlue} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={ROUTELY_CHART_COLORS.routeBlue} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="routelyMemory" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={ROUTELY_CHART_COLORS.runningGreen} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={ROUTELY_CHART_COLORS.runningGreen} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ROUTELY_CHART_COLORS.rackLine} strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: ROUTELY_CHART_COLORS.mutedInk, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis width={34} domain={[0, 100]} tick={{ fill: ROUTELY_CHART_COLORS.mutedInk, fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: ROUTELY_CHART_COLORS.routeBlue, strokeOpacity: 0.28 }}
                contentStyle={{ border: `1px solid ${ROUTELY_CHART_COLORS.rackLine}`, borderRadius: 12, color: ROUTELY_CHART_COLORS.hostInk }}
                formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, name === "cpu" ? "CPU" : "RAM"]}
              />
              <Area type="monotone" dataKey="memory" name="RAM" stroke={ROUTELY_CHART_COLORS.runningGreen} strokeWidth={2.5} fill="url(#routelyMemory)" connectNulls />
              <Area type="monotone" dataKey="cpu" name="CPU" stroke={ROUTELY_CHART_COLORS.routeBlue} strokeWidth={2.5} fill="url(#routelyCpu)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState title="Waiting for resource samples" detail={emptyReason || "The dashboard has no CPU/RAM history yet. Current values appear in the summary when the backend provides them."} />
        )}
      </div>
    </section>
  );
}

function SummaryPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-1 font-mono text-sm font-black text-[#172033]"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: color }} />{value}</p>
    </div>
  );
}

function ChartEmptyState({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-[#DCE3EE] px-4 text-center">
      <div>
        <p className="text-sm font-black text-[#172033]">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-[#64748B]">{detail}</p>
      </div>
    </div>
  );
}
