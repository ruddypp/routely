import { DashboardPageContent } from "./page-content";
import { MobileNav } from "./mobile-nav";
import { ServerRail } from "./server-rail";
import { SidebarNav } from "./sidebar-nav";
import type { DashboardShellProps } from "./types";

export function DashboardShell({ activeModule, children, onSelect, status }: DashboardShellProps) {
  return (
    <main className="h-screen overflow-hidden bg-background text-foreground md:h-auto md:min-h-screen md:overflow-x-hidden md:overflow-y-visible">
      <div className="grid h-screen min-w-0 grid-rows-[minmax(0,1fr)_auto] md:h-auto md:min-h-screen md:grid-cols-[248px_minmax(0,1fr)] md:grid-rows-1 xl:grid-cols-[272px_minmax(0,1fr)]">
        <SidebarNav activeModule={activeModule} connected={status.connected} onSelect={onSelect} />

        <section className="min-w-0 overflow-x-hidden overflow-y-auto pb-3 md:overflow-y-visible md:pb-0">
          <ServerRail {...status} />
          <DashboardPageContent>{children}</DashboardPageContent>
        </section>

        <MobileNav activeModule={activeModule} connected={status.connected} onSelect={onSelect} />
      </div>
    </main>
  );
}
