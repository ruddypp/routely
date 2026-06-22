import type { ServerRailSignal, ShellStatus } from "./types";

export function ServerRail({ connected, compose, cpu, daemonUrl, disk, docker, loading, memory, mode, onRefresh, refreshing, updated, uptime, workspace }: ShellStatus) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#DCE3EE]/20 bg-[#172033] px-3 py-3 text-white shadow-[0_18px_60px_rgba(23,32,51,0.28)] backdrop-blur sm:px-4 lg:px-5" aria-label="Server Rail">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.8fr)_auto] xl:items-center">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 shadow-[inset_4px_0_0_#2563EB]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-full bg-[#2563EB] px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white">Server Rail</span>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#18A058]" : loading ? "bg-[#D97706]" : "bg-[#DC2626]"}`} aria-hidden="true" />
          </div>
          <p className="mt-1 truncate font-mono text-[13px] font-black text-white">{workspace}</p>
          <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#DCE3EE]/75">runtime host · {mode || "local"} session</p>
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
          className="h-10 justify-self-start rounded-full border border-white/15 bg-white px-4 text-[12px] font-black text-[#172033] shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition hover:bg-[#F6F8FB] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 xl:justify-self-end"
        >
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </header>
  );
}

function RailChip({ detail, label, tone, value }: ServerRailSignal) {
  const dot = tone === "ok" ? "bg-[#18A058]" : tone === "warn" ? "bg-[#D97706]" : tone === "error" ? "bg-[#DC2626]" : "bg-[#DCE3EE]/60";

  return (
    <div className="flex h-10 min-w-0 max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="shrink-0 font-bold uppercase tracking-[0.1em] text-[#DCE3EE]/70">{label}</span>
      <span className="min-w-0 max-w-[150px] truncate font-mono font-black text-white">{value}</span>
      {detail ? <span className="hidden max-w-[190px] truncate font-mono text-[10px] text-[#DCE3EE]/65 xl:inline">{detail}</span> : null}
    </div>
  );
}
