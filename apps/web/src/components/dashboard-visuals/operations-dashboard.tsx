import { ActivityTimeline } from "./activity-timeline";
import { AppStatusChart } from "./app-status-chart";
import { DiskUsageGauge } from "./disk-usage-gauge";
import { HostResourceChart } from "./host-resource-chart";
import { ROUTELY_CHART_COLORS } from "./palette";
import { TrafficSparkline } from "./traffic-sparkline";
import type { ActivityItem, AppStatusDatum, DiskUsageValue, HostResourceSample, TrafficPoint } from "./types";

export function OperationsDashboard({
  activeRoutes,
  activity,
  appStatus,
  connected,
  disk,
  domainsReadyLabel,
  hostMetricError,
  hostSamples,
  mode,
  onNavigate,
  pendingCount,
  resourceSummary,
  runningCount,
  serverReady,
  totalApps,
  trafficPoints,
  workspace
}: {
  activeRoutes: number;
  activity: ActivityItem[];
  appStatus: AppStatusDatum[];
  connected: boolean;
  disk: DiskUsageValue;
  domainsReadyLabel: string;
  hostMetricError?: string | null;
  hostSamples: HostResourceSample[];
  mode: string;
  onNavigate: (module: "apps" | "deployments" | "domains" | "github" | "server") => void;
  pendingCount: number;
  resourceSummary: { cpu: string; memory: string };
  runningCount: number;
  serverReady: boolean;
  totalApps: number;
  trafficPoints: TrafficPoint[];
  workspace: string;
}) {
  const healthTone = connected && serverReady ? "Ready" : connected ? "Needs checks" : "Offline";
  const heroDetail = connected
    ? "This Routely server session is reporting through the dashboard API. Charts only render values returned by the backend."
    : "Dashboard data is unavailable until the Routely server session reconnects.";

  return (
    <div className="grid gap-4 text-[#172033]">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#DCE3EE] bg-[#F6F8FB] shadow-[0_34px_90px_rgba(23,32,51,0.14)]">
        <div className="grid min-h-[290px] gap-5 bg-[linear-gradient(135deg,#F6F8FB_0%,#FFFFFF_48%,#EAF1FF_100%)] p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:p-6">
          <div className="flex min-w-0 flex-col justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE3EE] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB] shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#18A058]" : "bg-[#DC2626]"}`} aria-hidden="true" />
                Runtime host command board
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[0.95] tracking-[-0.04em] text-[#172033] sm:text-5xl">
                {workspace}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#475569]">{heroDetail}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <HeroButton label="Open apps" onClick={() => onNavigate("apps")} />
              <HeroButton label="Review server" onClick={() => onNavigate("server")} variant="secondary" />
              <HeroButton label="Deployments" onClick={() => onNavigate("deployments")} variant="secondary" />
            </div>
          </div>

          <div className="grid content-between gap-3 rounded-[1.35rem] border border-[#DCE3EE] bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE3EE] pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Server session</p>
                <p className="mt-1 text-2xl font-black text-[#172033]">{healthTone}</p>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#172033] font-mono text-xl font-black text-white shadow-[0_18px_35px_rgba(23,32,51,0.22)]">R</div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <HeroMetric label="Mode" value={mode || "local"} />
              <HeroMetric label="Apps running" value={`${runningCount}/${totalApps}`} />
              <HeroMetric label="Needs attention" value={String(pendingCount)} tone={pendingCount ? "warn" : "ok"} />
              <HeroMetric label="Domains" value={domainsReadyLabel} />
              <HeroMetric label="Routes" value={String(activeRoutes)} />
              <HeroMetric label="Server ready" value={serverReady ? "yes" : "pending"} tone={serverReady ? "ok" : "warn"} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <HostResourceChart cpuLabel={resourceSummary.cpu} emptyReason={hostMetricError} memoryLabel={resourceSummary.memory} samples={hostSamples} />
        <DiskUsageGauge disk={disk} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AppStatusChart data={appStatus} total={totalApps} />
        <TrafficSparkline activeRoutes={activeRoutes} points={trafficPoints} />
      </div>

      <ActivityTimeline items={activity} />
    </div>
  );
}

function HeroButton({ label, onClick, variant = "primary" }: { label: string; onClick: () => void; variant?: "primary" | "secondary" }) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition active:translate-y-px ${
        primary
          ? "bg-[#2563EB] text-white shadow-[0_16px_40px_rgba(37,99,235,0.24)] hover:bg-[#1D4ED8]"
          : "border border-[#DCE3EE] bg-white text-[#172033] hover:border-[#2563EB] hover:text-[#2563EB]"
      }`}
    >
      {label}
    </button>
  );
}

function HeroMetric({ label, tone = "info", value }: { label: string; tone?: "ok" | "warn" | "info"; value: string }) {
  const color = tone === "ok" ? ROUTELY_CHART_COLORS.runningGreen : tone === "warn" ? ROUTELY_CHART_COLORS.warningAmber : ROUTELY_CHART_COLORS.routeBlue;
  return (
    <div className="rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-mono text-lg font-black text-[#172033]"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{value}</p>
    </div>
  );
}
