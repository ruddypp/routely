import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { TopStatusBar } from "./top-status-bar";
import type { DashboardShellProps } from "./types";

export function DashboardShell({ activeModule, children, onSelect, status }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-rows-[1fr_auto] md:grid-cols-[248px_1fr] md:grid-rows-1 xl:grid-cols-[272px_1fr]">
        <Sidebar activeModule={activeModule} connected={status.connected} onSelect={onSelect} />

        <section className="min-w-0 pb-24 md:pb-0">
          <TopStatusBar {...status} />
          <div className="grid gap-3 px-3 py-3 sm:px-4 lg:px-5">{children}</div>
        </section>

        <MobileNav activeModule={activeModule} connected={status.connected} onSelect={onSelect} />
      </div>
    </main>
  );
}
