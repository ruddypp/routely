import { DASHBOARD_NAV_GROUPS, type DashboardModuleKey } from "./types";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SidebarNav({ activeModule, connected, onSelect }: { activeModule: DashboardModuleKey; connected: boolean; onSelect: (module: DashboardModuleKey) => void }) {
  return (
    <aside className="routely-sidebar hidden border-r border-border bg-background-soft px-3 py-4 md:block">
      <div className="flex items-center gap-3 px-2">
        <div className="routely-mark" aria-hidden="true">R</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">Routely</p>
          <p className="truncate text-[11px] text-muted">Runtime host operations</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-black/18 px-2.5 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-accent" : "bg-negative"}`} aria-hidden="true" />
          <p className="text-[11px] font-bold text-foreground">server session {connected ? "online" : "offline"}</p>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted">same-origin /api/* · solo operator</p>
      </div>

      <nav className="mt-5 space-y-4" aria-label="Dashboard modules">
        {DASHBOARD_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{group.label}</p>
            <div className="space-y-1">
              {group.modules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onSelect(module.key)}
                  className={`group flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] transition active:translate-y-px ${FOCUS_RING} ${
                    activeModule === module.key
                      ? "bg-surface-raised font-bold text-foreground shadow-[var(--inset-border)]"
                      : "text-muted hover:bg-white/[0.035] hover:text-foreground"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeModule === module.key ? "bg-accent" : module.signal && connected ? "bg-accent/55" : "bg-border-strong"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{module.label}</span>
                  <span className="hidden text-[10px] text-muted xl:inline">{module.summary}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
