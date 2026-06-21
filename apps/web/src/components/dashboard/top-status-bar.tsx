import type { ShellStatus } from "./types";

export function TopStatusBar({ connected, daemonUrl, loading, mode, onRefresh, refreshing, updated, workspace }: ShellStatus) {
  const modeLabel = mode || "local";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/94 px-3 py-2 backdrop-blur sm:px-4 lg:px-5">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">workspace</span>
            <p className="truncate font-mono text-[12px] font-semibold text-foreground">{workspace}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <StatusChip tone={connected ? "ok" : "error"} label="daemon" value={connected ? "connected" : "offline"} detail={daemonUrl} />
          <StatusChip tone={modeLabel === "production" ? "warn" : "ok"} label="mode" value={modeLabel} />
          <StatusChip tone="muted" label="scope" value="solo / one VPS" />
          <StatusChip tone={refreshing || loading ? "warn" : "muted"} label="state" value={loading ? "loading" : refreshing ? "refreshing" : `updated ${updated}`} />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="h-8 rounded-md border border-border bg-surface-raised px-3 text-[12px] font-bold text-foreground transition hover:border-border-strong hover:bg-surface-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusChip({ detail, label, tone, value }: { detail?: string; label: string; tone: "ok" | "warn" | "error" | "muted"; value: string }) {
  const dot = tone === "ok" ? "bg-accent" : tone === "warn" ? "bg-warning" : tone === "error" ? "bg-negative" : "bg-muted";
  return (
    <div className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-[11px] shadow-[var(--inset-border)]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="shrink-0 text-muted">{label}</span>
      <span className="max-w-[150px] truncate font-bold text-foreground">{value}</span>
      {detail ? <span className="hidden max-w-[190px] truncate font-mono text-[10px] text-muted xl:inline">{detail}</span> : null}
    </div>
  );
}
