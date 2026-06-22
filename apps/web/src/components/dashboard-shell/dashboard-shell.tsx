import { DashboardPageContent } from "./page-content";
import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";
import type { DashboardShellProps } from "./types";

export function DashboardShell({ activeModule, children, onSelect, status }: DashboardShellProps) {
  return (
    <main className="h-screen overflow-hidden bg-[#0A0D0B] text-[#F7FFF9] md:h-auto md:min-h-screen md:overflow-x-hidden md:overflow-y-visible">
      <div className="grid h-screen min-w-0 grid-rows-[minmax(0,1fr)_auto] md:h-auto md:min-h-screen md:grid-cols-[248px_minmax(0,1fr)] md:grid-rows-1 xl:grid-cols-[272px_minmax(0,1fr)]">
        <SidebarNav activeModule={activeModule} connected={status.connected} onSelect={onSelect} />

        <section className="min-w-0 overflow-x-hidden overflow-y-auto pb-3 md:overflow-y-visible md:pb-0">
          <DashboardDeckHeader />
          <DashboardPageContent>{children}</DashboardPageContent>
        </section>

        <MobileNav activeModule={activeModule} connected={status.connected} onSelect={onSelect} />
      </div>
    </main>
  );
}

function DashboardDeckHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#2D352F] bg-[#101412]/94 px-3 py-2 backdrop-blur sm:px-4" aria-label="Dashboard deck">
      <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(30,215,96,0.88),rgba(79,140,255,0.22),rgba(247,255,249,0.04),transparent)] shadow-[0_0_22px_rgba(30,215,96,0.22)]" />
    </header>
  );
}
