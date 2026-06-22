"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROUTELY_CHART_COLORS } from "./palette";
import type { TrafficPoint } from "./types";

export function TrafficSparkline({ activeRoutes, points }: { activeRoutes: number; points: TrafficPoint[] }) {
  const hasTraffic = points.length >= 2;

  return (
    <section className="rounded-[1.35rem] border border-[#DCE3EE] bg-white p-4 shadow-[0_24px_70px_rgba(23,32,51,0.08)]" aria-labelledby="traffic-sparkline-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Traffic</p>
          <h2 id="traffic-sparkline-title" className="mt-1 text-lg font-black text-[#172033]">Route hits</h2>
        </div>
        <span className="rounded-full border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-1 font-mono text-xs font-black text-[#172033]">{activeRoutes} routes</span>
      </div>

      <div className="mt-4 h-44 rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB] p-3" role="img" aria-label={hasTraffic ? "Traffic sparkline from proxy samples" : "Traffic samples unavailable"}>
        {hasTraffic ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ bottom: 0, left: -24, right: 8, top: 8 }}>
              <XAxis dataKey="label" tick={{ fill: ROUTELY_CHART_COLORS.mutedInk, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: ROUTELY_CHART_COLORS.mutedInk, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ border: `1px solid ${ROUTELY_CHART_COLORS.rackLine}`, borderRadius: 12, color: ROUTELY_CHART_COLORS.hostInk }} />
              <Line type="monotone" dataKey="value" stroke={ROUTELY_CHART_COLORS.routeBlue} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-[#DCE3EE] px-4 text-center">
            <div>
              <p className="text-sm font-black text-[#172033]">Traffic samples not wired yet</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-[#64748B]">Proxy routes can be counted, but request/routing samples are not in the current dashboard API. This panel stays empty instead of showing fake success traffic.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
