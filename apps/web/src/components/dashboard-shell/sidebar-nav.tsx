import Image from "next/image";

import { DASHBOARD_NAV_GROUPS, type DashboardModuleKey } from "./types";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SidebarNav({ activeModule, connected, onSelect }: { activeModule: DashboardModuleKey; connected: boolean; onSelect: (module: DashboardModuleKey) => void }) {
  return (
    <aside className="routely-sidebar hidden h-screen overflow-hidden border-r border-[#2D352F]/60 bg-[#0C100E] px-3 py-3 text-[#A8B3AD] md:flex md:flex-col">
      <div className="flex items-center gap-3 rounded-[20px] border border-[#2D352F]/60 bg-[#121714]/80 px-3 py-2 opacity-85">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0A0D0B] opacity-80 shadow-[0_0_18px_rgba(30,215,96,0.1)]" aria-hidden="true">
          <Image src="/routely.png" alt="" width={40} height={40} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black leading-tight text-[#DDE7E0]">Routely</p>
          <p className="truncate text-[11px] text-[#A8B3AD]/75">Runtime host console</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#2D352F]/60 bg-black/14 px-3 py-2 opacity-80">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#1ED760]" : "bg-[#EF4444]"}`} aria-hidden="true" />
          <p className="text-[11px] font-bold text-[#DDE7E0]">server session {connected ? "online" : "offline"}</p>
        </div>
        <p className="mt-1 font-mono text-[10px] text-[#A8B3AD]/70">same-origin /api/* · solo operator</p>
      </div>

      <nav className="mt-4 min-h-0 flex-1 space-y-3 overflow-hidden" aria-label="Dashboard modules">
        {DASHBOARD_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#A8B3AD]/70">{group.label}</p>
            <div className="space-y-1">
              {group.modules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onSelect(module.key)}
                  className={`group flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] transition active:translate-y-px ${FOCUS_RING} ${
                    activeModule === module.key
                      ? "bg-[#1A201C] font-black text-[#EEF7F0] shadow-[inset_3px_0_0_#1ED760]"
                      : "text-[#A8B3AD]/72 hover:bg-[#1A201C]/70 hover:text-[#E6EFE8]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeModule === module.key ? "bg-[#1ED760]" : module.signal && connected ? "bg-[#1ED760]/40" : "bg-[#2D352F]/70"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{module.label}</span>
                  <span className="hidden text-[10px] text-[#A8B3AD]/64 xl:inline">{module.summary}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-3 rounded-2xl border border-[#2D352F]/45 bg-black/10 px-3 py-2 font-mono text-[10px] text-[#A8B3AD]/55">
        shell locked · content scrolls
      </div>
    </aside>
  );
}
