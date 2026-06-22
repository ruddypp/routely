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
        <div className="grid gap-3 p-1 sm:p-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p id="runtime-control-title" className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1ED760]">Runtime operations</p>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-[#A8B3AD]">Control managed apps, review host signals, and jump into GitHub without crowding the dashboard deck.</p>
            </div>
            <GitHubButton onClick={onConnectGithub} />
          </div>

          <RuntimeControlPanel
            mode={mode}
            onRefresh={onRefresh}
            onStartAll={onStartAll}
            onStopAll={onStopAll}
            refreshing={refreshing}
            startAllBusy={startAllBusy}
            startAllReason={startAllReason}
            stopAllBusy={stopAllBusy}
            stopAllReason={stopAllReason}
          />

          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.58fr)_minmax(360px,0.42fr)]">
            <OperationsSummary
              activeRoutes={activeRoutes}
              domainsReadyLabel={domainsReadyLabel}
              mode={mode}
              pendingCount={pendingCount}
              resourceSummary={resourceSummary}
              runningCount={runningCount}
              stateTone={stateTone}
              stateValue={healthTone}
              totalApps={totalApps}
            />

            <div className="grid content-start gap-3">
              {alertMessages.length > 0 ? <CompactWarning messages={alertMessages} /> : null}
              <ActivityTimeline items={activity.slice(0, 3)} />
            </div>
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

function RuntimeControlPanel({ mode, onRefresh, onStartAll, onStopAll, refreshing, startAllBusy, startAllReason, stopAllBusy, stopAllReason }: { mode: string; onRefresh: () => void; onStartAll: () => void; onStopAll: () => void; refreshing: boolean; startAllBusy: boolean; startAllReason: string | null; stopAllBusy: boolean; stopAllReason: string | null }) {
  return (
    <div className="rounded-[20px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1ED760]">Runtime controls</p>
            <span className="rounded-full border border-[#2D352F] bg-[#222823] px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-[#A8B3AD]">{mode || "runtime host"}</span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-5 text-[#A8B3AD]">Start or stop managed runtime apps using existing lifecycle APIs. No server state is invented here.</p>
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:min-w-[420px]">
          <DashboardActionButton label={startAllBusy ? "Starting" : "Start"} onClick={onStartAll} disabled={Boolean(startAllReason)} reason={startAllReason} tone="primary" />
          <DashboardActionButton label={stopAllBusy ? "Stopping" : "Stop"} onClick={onStopAll} disabled={Boolean(stopAllReason)} reason={stopAllReason} tone="danger" />
          <DashboardActionButton label={refreshing ? "Refreshing" : "Refresh"} onClick={onRefresh} disabled={refreshing} reason={refreshing ? "refresh in progress" : null} />
        </div>
      </div>
    </div>
  );
}

function GitHubButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#2D352F] bg-[#222823] px-4 text-sm font-black text-[#F7FFF9] transition hover:border-[#1ED760] hover:text-[#1ED760] active:translate-y-px"
    >
      <GitHubIcon />
      <span>Connect GitHub</span>
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.93.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.34 9.34 0 0 1 12 7.01c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.17 10.17 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function OperationsSummary({ activeRoutes, domainsReadyLabel, mode, pendingCount, resourceSummary, runningCount, stateTone, stateValue, totalApps }: { activeRoutes: number; domainsReadyLabel: string; mode: string; pendingCount: number; resourceSummary: { cpu: string; memory: string }; runningCount: number; stateTone: "ok" | "warn" | "error" | "info"; stateValue: string; totalApps: number }) {
  return (
    <div className="rounded-[20px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A8B3AD]">Host and fleet</p>
          <h2 className="mt-1 text-base font-black text-[#F7FFF9]">Operational summary</h2>
        </div>
        <StatusDot tone={stateTone} label={stateValue} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SummaryLine label="Session" value={mode || "runtime host"} color={ROUTELY_CHART_COLORS.routeBlue} />
        <SummaryLine label="Running" value={`${runningCount}/${totalApps}`} color={runningCount ? ROUTELY_CHART_COLORS.routelyGreen : ROUTELY_CHART_COLORS.routeBlue} />
        <SummaryLine label="Attention" value={String(pendingCount)} color={pendingCount ? ROUTELY_CHART_COLORS.warningAmber : ROUTELY_CHART_COLORS.routelyGreen} />
        <SummaryLine label="Routes" value={String(activeRoutes)} color={ROUTELY_CHART_COLORS.routelyGreen} />
        <SummaryLine label="CPU" value={resourceSummary.cpu} color={ROUTELY_CHART_COLORS.routeBlue} />
        <SummaryLine label="RAM" value={resourceSummary.memory} color={ROUTELY_CHART_COLORS.routelyGreen} />
        <SummaryLine label="Domains" value={domainsReadyLabel} color={ROUTELY_CHART_COLORS.routeBlue} />
      </div>
    </div>
  );
}

function StatusDot({ label, tone }: { label: string; tone: "ok" | "warn" | "error" | "info" }) {
  const color = tone === "ok" ? ROUTELY_CHART_COLORS.routelyGreen : tone === "warn" ? ROUTELY_CHART_COLORS.warningAmber : tone === "error" ? ROUTELY_CHART_COLORS.failureRed : ROUTELY_CHART_COLORS.routeBlue;
  return <span className="inline-flex items-center gap-2 rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1 font-mono text-xs font-black text-[#F7FFF9]"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>;
}

function SummaryLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-[#2D352F] bg-[#101412] px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#A8B3AD]"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>
      <span className="truncate font-mono text-xs font-black text-[#F7FFF9]">{value}</span>
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
