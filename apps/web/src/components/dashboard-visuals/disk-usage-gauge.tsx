"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { DiskUsageValue } from "./types";

export function DiskUsageGauge({ disk }: { disk: DiskUsageValue }) {
  const hasDiskData = disk.percent != null;
  const percent = Math.max(0, Math.min(100, disk.percent || 0));
  const tone = percent >= 90 ? ROUTELY_CHART_COLORS.failureRed : percent >= 75 ? ROUTELY_CHART_COLORS.warningAmber : ROUTELY_CHART_COLORS.routeBlue;

  return (
    <section className="rounded-[1.35rem] border border-[#DCE3EE] bg-white p-4 shadow-[0_24px_70px_rgba(23,32,51,0.08)]" aria-labelledby="disk-gauge-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Disk</p>
          <h2 id="disk-gauge-title" className="mt-1 text-lg font-black text-[#172033]">Runtime storage</h2>
        </div>
        <span className="rounded-full border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-1 font-mono text-xs font-black text-[#172033]">{hasDiskData ? `${percent.toFixed(0)}%` : "pending"}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-center">
        <div className="h-40 rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB] p-2" role="img" aria-label={hasDiskData ? `Disk ${disk.usedLabel} of ${disk.totalLabel} used` : "Disk usage pending"}>
          {hasDiskData ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={[{ name: "disk", value: percent, fill: tone }]} innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: ROUTELY_CHART_COLORS.rackLine }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center rounded-full border border-dashed border-[#DCE3EE] text-center text-xs font-bold text-[#64748B]">pending samples</div>
          )}
        </div>

        <div className="grid gap-2 text-sm">
          <MetricLine label="Used" value={disk.usedLabel} />
          <MetricLine label="Total" value={disk.totalLabel} />
          <p className="rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-2 text-xs leading-5 text-[#64748B]">
            {hasDiskData ? "Disk usage comes from the latest host metric sample." : "No disk sample has been reported yet; the gauge stays empty rather than inventing capacity."}
          </p>
        </div>
      </div>
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE3EE] bg-white px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">{label}</span>
      <span className="font-mono text-sm font-black text-[#172033]">{value}</span>
    </div>
  );
}
