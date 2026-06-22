import Image from "next/image";

import { DASHBOARD_NAV_GROUPS, type DashboardModuleKey } from "./types";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SidebarNav({ activeModule, connected, onSelect }: { activeModule: DashboardModuleKey; connected: boolean; onSelect: (module: DashboardModuleKey) => void }) {
  return (
    <aside className="routely-sidebar hidden border-r border-[#2D352F] bg-[#101412] px-3 py-3 md:block">
      <div className="flex items-center gap-3 rounded-[20px] border border-[#2D352F] bg-[#171C1A] px-3 py-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0A0D0B] shadow-[0_0_26px_rgba(30,215,96,0.18)]" aria-hidden="true">
          <Image src="/routely.png" alt="" width={40} height={40} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black leading-tight text-[#F7FFF9]">Routely</p>
          <p className="truncate text-[11px] text-[#A8B3AD]">Runtime host console</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#2D352F] bg-black/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#1ED760]" : "bg-[#EF4444]"}`} aria-hidden="true" />
          <p className="text-[11px] font-bold text-[#F7FFF9]">server session {connected ? "online" : "offline"}</p>
        </div>
        <p className="mt-1 font-mono text-[10px] text-[#A8B3AD]">same-origin /api/* · solo operator</p>
      </div>

      <nav className="mt-4 space-y-3" aria-label="Dashboard modules">
        {DASHBOARD_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#A8B3AD]">{group.label}</p>
            <div className="space-y-1">
              {group.modules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onSelect(module.key)}
                  className={`group flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] transition active:translate-y-px ${FOCUS_RING} ${
                    activeModule === module.key
                      ? "bg-[#222823] font-black text-[#F7FFF9] shadow-[inset_3px_0_0_#1ED760]"
                      : "text-[#A8B3AD] hover:bg-[#222823]/55 hover:text-[#F7FFF9]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeModule === module.key ? "bg-[#1ED760]" : module.signal && connected ? "bg-[#1ED760]/55" : "bg-[#2D352F]"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{module.label}</span>
                  <span className="hidden text-[10px] text-[#A8B3AD] xl:inline">{module.summary}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
