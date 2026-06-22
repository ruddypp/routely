import type { ServerRailSignal, ShellStatus } from "./types";

export function ServerRail({ connected, compose, cpu, daemonUrl, disk, docker, loading, memory, mode, onRefresh, refreshing, updated, uptime, workspace }: ShellStatus) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/94 px-3 py-2 backdrop-blur sm:px-4 lg:px-5" aria-label="Server Rail">
      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.8fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">runtime host</span>
            <p className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold text-foreground">{workspace}</p>
          </div>
          <p className="mt-1 truncate text-[10px] text-muted">server session · {mode || "local"}</p>
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:gap-2">
          <RailChip tone={connected ? "ok" : loading ? "warn" : "error"} label="daemon" value={connected ? "connected" : loading ? "loading" : "offline"} detail={daemonUrl} />
          <RailChip {...docker} />
          <RailChip {...compose} />
          <RailChip {...cpu} />
          <RailChip {...memory} />
          <RailChip {...disk} />
          <RailChip tone={uptime === "pending" ? "muted" : "ok"} label="uptime" value={uptime} />
          <RailChip tone={refreshing || loading ? "warn" : "muted"} label="state" value={loading ? "loading" : refreshing ? "refreshing" : `updated ${updated}`} />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || loading}
          className="h-8 justify-self-start rounded-md border border-border bg-surface-raised px-3 text-[12px] font-bold text-foreground transition hover:border-border-strong hover:bg-surface-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 xl:justify-self-end"
        >
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </header>
  );
}

function RailChip({ detail, label, tone, value }: ServerRailSignal) {
  const dot = tone === "ok" ? "bg-accent" : tone === "warn" ? "bg-warning" : tone === "error" ? "bg-negative" : "bg-muted";

  return (
    <div className="flex h-8 min-w-0 max-w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-[11px] shadow-[var(--inset-border)]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 max-w-[150px] truncate font-bold text-foreground">{value}</span>
      {detail ? <span className="hidden max-w-[190px] truncate font-mono text-[10px] text-muted xl:inline">{detail}</span> : null}
    </div>
  );
}
