import { DASHBOARD_NAV_GROUPS, type DashboardModuleKey } from "./types";

export function MobileNav({ activeModule, connected, onSelect }: { activeModule: DashboardModuleKey; connected: boolean; onSelect: (module: DashboardModuleKey) => void }) {
  return (
    <nav className="z-30 border-t border-border bg-background/96 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[rgba(0,0,0,0.55)_0px_-10px_28px] backdrop-blur md:hidden" aria-label="Dashboard modules">
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DASHBOARD_NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex shrink-0 snap-start items-center gap-1 rounded-md border border-border bg-surface/85 p-1">
            <span className="px-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{group.label}</span>
            {group.modules.map((module) => (
              <button
                key={module.key}
                type="button"
                onClick={() => onSelect(module.key)}
                className={`flex h-8 max-w-[96px] items-center gap-1.5 rounded px-2 text-[11px] font-bold transition active:translate-y-px ${
                  activeModule === module.key ? "bg-surface-raised text-foreground shadow-[var(--inset-border)]" : "text-muted"
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeModule === module.key ? "bg-accent" : module.signal && connected ? "bg-accent/55" : "bg-border-strong"}`} aria-hidden="true" />
                <span className="truncate">{module.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
