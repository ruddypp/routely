"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { AppStatusDatum } from "./types";

export function AppStatusChart({ data, total }: { data: AppStatusDatum[]; total: number }) {
  const visibleData = data.filter((item) => item.value > 0);

  return (
    <section className="rounded-[1.35rem] border border-[#DCE3EE] bg-white p-4 shadow-[0_24px_70px_rgba(23,32,51,0.08)]" aria-labelledby="app-status-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">App fleet</p>
          <h2 id="app-status-chart-title" className="mt-1 text-lg font-black text-[#172033]">Status distribution</h2>
        </div>
        <span className="rounded-full border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-1 font-mono text-xs font-black text-[#172033]">{total} apps</span>
      </div>

      <div className="mt-4 h-44 rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB] p-3" role="img" aria-label={visibleData.length ? data.map((item) => `${item.label}: ${item.value}`).join(", ") : "No managed apps yet"}>
        {visibleData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ bottom: 0, left: 8, right: 8, top: 0 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis dataKey="label" type="category" width={86} tick={{ fill: ROUTELY_CHART_COLORS.hostInk, fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(37,99,235,0.06)" }}
                contentStyle={{ border: `1px solid ${ROUTELY_CHART_COLORS.rackLine}`, borderRadius: 12, color: ROUTELY_CHART_COLORS.hostInk }}
                formatter={(value) => [`${value ?? 0} apps`, "Count"]}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={16}>
                {data.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-[#DCE3EE] px-4 text-center">
            <div>
              <p className="text-sm font-black text-[#172033]">No apps in the registry</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#64748B]">Add and verify an app before Routely shows running, stopped, failed, or disabled counts.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE3EE] bg-white px-3 py-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 font-bold text-[#172033]"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</span>
            <span className="font-mono font-black text-[#172033]">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
