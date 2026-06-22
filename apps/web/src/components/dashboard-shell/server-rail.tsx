import type { ServerRailSignal, ShellStatus } from "./types";

const toneDot = {
  ok: "bg-[#1ED760]",
  warn: "bg-[#F59E0B]",
  error: "bg-[#EF4444]",
  muted: "bg-[#A8B3AD]/60"
} satisfies Record<ServerRailSignal["tone"], string>;

export function ServerRail({ connected, compose, cpu, daemonUrl, disk, docker, loading, memory, mode, onRefresh, refreshing, updated, uptime, workspace }: ShellStatus) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#2D352F] bg-[#101412]/96 px-3 py-2 text-[#F7FFF9] shadow-[0_10px_34px_rgba(0,0,0,0.34)] backdrop-blur sm:px-4" aria-label="Server Rail">
      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(210px,0.58fr)_minmax(0,1.9fr)_auto] xl:items-center">
        <div className="min-w-0 rounded-full border border-[#2D352F] bg-[#171C1A] px-3 py-1.5 shadow-[inset_3px_0_0_#1ED760]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-[#1ED760]" : loading ? "bg-[#F59E0B]" : "bg-[#EF4444]"}`} aria-hidden="true" />
            <span className="shrink-0 rounded-full bg-[#1ED760]/12 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-[#1ED760]">Server Rail</span>
            <p className="min-w-0 truncate font-mono text-[12px] font-black text-[#F7FFF9]">{workspace}</p>
            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8B3AD] sm:inline">{mode || "runtime host"} session</span>
          </div>
        </div>

        <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex-wrap xl:overflow-visible xl:pb-0">
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
          className="h-8 justify-self-start rounded-full border border-[#1ED760]/35 bg-[#1ED760] px-4 text-[11px] font-black text-[#07120B] shadow-[0_12px_28px_rgba(30,215,96,0.18)] transition hover:bg-[#45E078] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 xl:justify-self-end"
        >
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </header>
  );
}

function RailChip({ detail, label, tone, value }: ServerRailSignal) {
  return (
    <div className="flex h-8 min-w-fit max-w-full items-center gap-2 rounded-full border border-[#2D352F] bg-[#171C1A] px-3 text-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
      <span className="shrink-0 font-black uppercase tracking-[0.1em] text-[#A8B3AD]">{label}</span>
      <span className="min-w-0 max-w-[120px] truncate font-mono font-black text-[#F7FFF9]">{value}</span>
      {detail ? <span className="hidden max-w-[160px] truncate font-mono text-[10px] text-[#A8B3AD] 2xl:inline">{detail}</span> : null}
    </div>
  );
}
