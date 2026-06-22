"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { AppStatusDatum } from "./types";

export function AppStatusChart({ data, total }: { data: AppStatusDatum[]; total: number }) {
  const visibleData = data.filter((item) => item.value > 0);

  return (
    <section className="rounded-[22px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]" aria-labelledby="app-status-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A8B3AD]">App fleet</p>
          <h2 id="app-status-chart-title" className="mt-1 text-base font-black text-[#F7FFF9]">Status distribution</h2>
        </div>
        <span className="rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1 font-mono text-xs font-black text-[#F7FFF9]">{total} apps</span>
      </div>

      <div className="mt-3 h-36 rounded-[18px] border border-[#2D352F] bg-[#101412] p-2" role="img" aria-label={visibleData.length ? data.map((item) => `${item.label}: ${item.value}`).join(", ") : "No managed apps yet"}>
        {visibleData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ bottom: 0, left: 0, right: 8, top: 0 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis dataKey="label" type="category" width={86} tick={{ fill: ROUTELY_CHART_COLORS.mutedText, fontSize: 10, fontWeight: 800 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(30,215,96,0.07)" }}
                contentStyle={{ background: ROUTELY_CHART_COLORS.elevatedCharcoal, border: `1px solid ${ROUTELY_CHART_COLORS.softBorder}`, borderRadius: 14, color: ROUTELY_CHART_COLORS.primaryText }}
                labelStyle={{ color: ROUTELY_CHART_COLORS.mutedText }}
                formatter={(value) => [`${value ?? 0} apps`, "Count"]}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={14}>
                {data.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#2D352F] px-3 text-center">
            <div>
              <p className="text-xs font-black text-[#F7FFF9]">No apps registered</p>
              <p className="mt-1 max-w-xs text-[11px] leading-4 text-[#A8B3AD]">Add and verify an app before Routely shows fleet state.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1.5 text-xs">
            <span className="flex min-w-0 items-center gap-2 font-bold text-[#F7FFF9]"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</span>
            <span className="font-mono font-black text-[#F7FFF9]">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
