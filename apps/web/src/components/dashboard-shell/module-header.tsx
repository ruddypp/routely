import type { ReactNode } from "react";
import { getDashboardModule, type DashboardModuleKey } from "./types";

export function ModuleHeader({ actions, module, stats }: { actions?: ReactNode; module: DashboardModuleKey; stats?: ReactNode }) {
  const meta = getDashboardModule(module);

  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{meta.summary}</p>
        <h1 className="text-xl font-bold leading-tight">{meta.label}</h1>
      </div>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{stats}{actions}</div>
    </div>
  );
}
