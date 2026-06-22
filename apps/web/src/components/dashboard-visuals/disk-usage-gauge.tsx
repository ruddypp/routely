"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { DiskUsageValue } from "./types";

export function DiskUsageGauge({ disk }: { disk: DiskUsageValue }) {
  const hasDiskData = disk.percent != null;
  const percent = Math.max(0, Math.min(100, disk.percent || 0));
  const tone = percent >= 90 ? ROUTELY_CHART_COLORS.failureRed : percent >= 75 ? ROUTELY_CHART_COLORS.warningAmber : ROUTELY_CHART_COLORS.routelyGreen;

  return (
    <section className="rounded-[22px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]" aria-labelledby="disk-gauge-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A8B3AD]">Disk</p>
          <h2 id="disk-gauge-title" className="mt-1 text-base font-black text-[#F7FFF9]">Runtime storage</h2>
        </div>
        <span className="rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1 font-mono text-xs font-black text-[#F7FFF9]">{hasDiskData ? `${percent.toFixed(0)}%` : "pending"}</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[128px_minmax(0,1fr)] sm:items-center">
        <div className="h-32 rounded-[18px] border border-[#2D352F] bg-[#101412] p-2" role="img" aria-label={hasDiskData ? `Disk ${disk.usedLabel} of ${disk.totalLabel} used` : "Disk usage pending"}>
          {hasDiskData ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={[{ name: "disk", value: percent, fill: tone }]} innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: ROUTELY_CHART_COLORS.softBorder }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center rounded-full border border-dashed border-[#2D352F] text-center text-[11px] font-bold text-[#A8B3AD]">pending</div>
          )}
        </div>

        <div className="grid gap-2 text-sm">
          <MetricLine label="Used" value={disk.usedLabel} />
          <MetricLine label="Total" value={disk.totalLabel} />
          <p className="rounded-2xl border border-[#2D352F] bg-[#101412] px-3 py-2 text-[11px] leading-4 text-[#A8B3AD]">
            {hasDiskData ? "Latest host disk sample." : "No disk sample yet; gauge stays empty."}
          </p>
        </div>
      </div>
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#A8B3AD]">{label}</span>
      <span className="font-mono text-xs font-black text-[#F7FFF9]">{value}</span>
    </div>
  );
}
