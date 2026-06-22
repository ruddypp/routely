"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { TrafficPoint } from "./types";

export function TrafficSparkline({ activeRoutes, points }: { activeRoutes: number; points: TrafficPoint[] }) {
  const hasTraffic = points.length >= 2;

  return (
    <section className="rounded-[22px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]" aria-labelledby="traffic-sparkline-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A8B3AD]">Traffic</p>
          <h2 id="traffic-sparkline-title" className="mt-1 text-base font-black text-[#F7FFF9]">Route hits</h2>
        </div>
        <span className="rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1 font-mono text-xs font-black text-[#F7FFF9]">{activeRoutes} routes</span>
      </div>

      <div className="mt-3 h-36 rounded-[18px] border border-[#2D352F] bg-[#101412] p-2" role="img" aria-label={hasTraffic ? "Traffic sparkline from proxy samples" : "Traffic samples unavailable"}>
        {hasTraffic ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ bottom: 0, left: -24, right: 8, top: 8 }}>
              <XAxis dataKey="label" tick={{ fill: ROUTELY_CHART_COLORS.mutedText, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: ROUTELY_CHART_COLORS.mutedText, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: ROUTELY_CHART_COLORS.elevatedCharcoal, border: `1px solid ${ROUTELY_CHART_COLORS.softBorder}`, borderRadius: 14, color: ROUTELY_CHART_COLORS.primaryText }} labelStyle={{ color: ROUTELY_CHART_COLORS.mutedText }} />
              <Line type="monotone" dataKey="value" stroke={ROUTELY_CHART_COLORS.routeBlue} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#2D352F] px-3 text-center">
            <div>
              <p className="text-xs font-black text-[#F7FFF9]">Traffic samples unavailable</p>
              <p className="mt-1 max-w-sm text-[11px] leading-4 text-[#A8B3AD]">Routes are counted, but request samples are not wired yet.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
