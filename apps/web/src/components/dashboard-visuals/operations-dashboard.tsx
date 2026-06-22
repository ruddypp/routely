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
  notices,
  onConnectGithub,
  onRefresh,
  onStartAll,
  onStopAll,
  pendingCount,
  refreshing,
  resourceSummary,
  runningCount,
  serverReady,
  startAllBusy,
  startAllReason,
  stopAllBusy,
  stopAllReason,
  totalApps,
  trafficPoints
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
  notices: string[];
  onConnectGithub: () => void;
  onRefresh: () => void;
  onStartAll: () => void;
  onStopAll: () => void;
  pendingCount: number;
  refreshing: boolean;
  resourceSummary: { cpu: string; memory: string };
  runningCount: number;
  serverReady: boolean;
  startAllBusy: boolean;
  startAllReason: string | null;
  stopAllBusy: boolean;
  stopAllReason: string | null;
  totalApps: number;
  trafficPoints: TrafficPoint[];
}) {
  const healthTone = connected && serverReady ? "Ready" : connected ? "Needs checks" : "Offline";
  const stateTone = connected && serverReady ? "ok" : connected ? "warn" : "error";
  const alertMessages = Array.from(new Set([...notices, hostMetricError].filter((message): message is string => Boolean(message))));

  return (
    <div className="grid gap-3 text-[#F7FFF9]">
      <section className="rounded-[24px] border border-[#2D352F] bg-[#101412] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.34)]" aria-labelledby="runtime-control-title">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.08fr)_minmax(340px,0.8fr)]">
          <RuntimeControlPanel
            mode={mode}
            onConnectGithub={onConnectGithub}
            onRefresh={onRefresh}
            onStartAll={onStartAll}
            onStopAll={onStopAll}
            refreshing={refreshing}
            startAllBusy={startAllBusy}
            startAllReason={startAllReason}
            stopAllBusy={stopAllBusy}
            stopAllReason={stopAllReason}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <HeroMetric label="State" value={healthTone} tone={stateTone} />
            <HeroMetric label="Session" value={mode || "runtime host"} />
            <HeroMetric label="Running" value={`${runningCount}/${totalApps}`} tone={runningCount ? "ok" : "info"} />
            <HeroMetric label="Attention" value={String(pendingCount)} tone={pendingCount ? "warn" : "ok"} />
            <MiniMetric title="CPU" value={resourceSummary.cpu} detail="latest sample" color={ROUTELY_CHART_COLORS.routeBlue} />
            <MiniMetric title="RAM" value={resourceSummary.memory} detail="latest sample" color={ROUTELY_CHART_COLORS.routelyGreen} />
            <MiniMetric title="Domains" value={domainsReadyLabel} detail="DNS ready" color={ROUTELY_CHART_COLORS.routeBlue} />
            <MiniMetric title="Routes" value={String(activeRoutes)} detail="proxy enabled" color={ROUTELY_CHART_COLORS.routelyGreen} />
          </div>

          <div className="grid gap-3">
            {alertMessages.length > 0 ? <CompactWarning messages={alertMessages} /> : null}
            <ActivityTimeline items={activity.slice(0, 3)} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <HostResourceChart cpuLabel={resourceSummary.cpu} emptyReason={hostMetricError} memoryLabel={resourceSummary.memory} samples={hostSamples} />
        <DiskUsageGauge disk={disk} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AppStatusChart data={appStatus} total={totalApps} />
        <TrafficSparkline activeRoutes={activeRoutes} points={trafficPoints} />
      </div>

      {activity.length > 3 ? <ActivityTimeline items={activity.slice(3)} /> : null}
    </div>
  );
}

function RuntimeControlPanel({ mode, onConnectGithub, onRefresh, onStartAll, onStopAll, refreshing, startAllBusy, startAllReason, stopAllBusy, stopAllReason }: { mode: string; onConnectGithub: () => void; onRefresh: () => void; onStartAll: () => void; onStopAll: () => void; refreshing: boolean; startAllBusy: boolean; startAllReason: string | null; stopAllBusy: boolean; stopAllReason: string | null }) {
  return (
    <div className="grid content-between gap-4 rounded-[20px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p id="runtime-control-title" className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1ED760]">Runtime controls</p>
          <span className="rounded-full border border-[#2D352F] bg-[#222823] px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-[#A8B3AD]">{mode || "runtime host"}</span>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-5 text-[#A8B3AD]">Start or stop managed runtime apps using existing lifecycle APIs. No server state is invented here.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <DashboardActionButton label={startAllBusy ? "Starting" : "Start"} onClick={onStartAll} disabled={Boolean(startAllReason)} reason={startAllReason} tone="primary" />
        <DashboardActionButton label={stopAllBusy ? "Stopping" : "Stop"} onClick={onStopAll} disabled={Boolean(stopAllReason)} reason={stopAllReason} tone="danger" />
        <DashboardActionButton label={refreshing ? "Refreshing" : "Refresh"} onClick={onRefresh} disabled={refreshing} reason={refreshing ? "refresh in progress" : null} />
        <DashboardActionButton label="Connect GitHub" onClick={onConnectGithub} />
      </div>
    </div>
  );
}

function CompactWarning({ messages }: { messages: string[] }) {
  return (
    <div className="grid gap-2 rounded-[18px] border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-2 text-xs font-bold text-[#F7FFF9]">
      {messages.map((message) => (
        <div key={message} className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]" aria-hidden="true" />
          <span className="truncate">{message}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardActionButton({ disabled = false, label, onClick, reason, tone = "secondary" }: { disabled?: boolean; label: string; onClick: () => void; reason?: string | null; tone?: "primary" | "secondary" | "danger" }) {
  const toneClass = tone === "primary"
    ? "border-[#1ED760]/40 bg-[#1ED760] text-[#061007] shadow-[0_14px_34px_rgba(30,215,96,0.18)] hover:bg-[#28E36B]"
    : tone === "danger"
      ? "border-[#EF4444]/35 bg-[#EF4444]/14 text-[#F7FFF9] hover:border-[#EF4444]/65 hover:bg-[#EF4444]/20"
      : "border-[#2D352F] bg-[#222823] text-[#F7FFF9] hover:border-[#1ED760] hover:text-[#1ED760]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={reason || label}
      className={`h-10 rounded-full border px-4 text-sm font-black transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function HeroMetric({ label, tone = "info", value }: { label: string; tone?: "ok" | "warn" | "error" | "info"; value: string }) {
  const color = tone === "ok" ? ROUTELY_CHART_COLORS.routelyGreen : tone === "warn" ? ROUTELY_CHART_COLORS.warningAmber : tone === "error" ? ROUTELY_CHART_COLORS.failureRed : ROUTELY_CHART_COLORS.routeBlue;
  return (
    <div className="rounded-[18px] border border-[#2D352F] bg-[#171C1A] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#A8B3AD]">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-mono text-base font-black text-[#F7FFF9]"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{value}</p>
    </div>
  );
}

function MiniMetric({ color, detail, title, value }: { color: string; detail: string; title: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#2D352F] bg-[#171C1A]/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#A8B3AD]">{title}</p>
      <p className="mt-1 flex items-center gap-2 font-mono text-xl font-black text-[#F7FFF9]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{value}</p>
      <p className="mt-1 text-xs text-[#A8B3AD]">{detail}</p>
    </div>
  );
}
