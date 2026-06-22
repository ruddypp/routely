import type { ReactNode } from "react";

export function DashboardPageContent({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-3 px-3 py-3 sm:px-4 lg:px-5">{children}</div>;
}
