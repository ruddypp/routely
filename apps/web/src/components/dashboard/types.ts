import type { ReactNode } from "react";

export type DashboardModuleKey =
  | "overview"
  | "apps"
  | "logs"
  | "health"
  | "metrics"
  | "deployments"
  | "domains"
  | "github"
  | "env"
  | "databases"
  | "backups"
  | "settings";

export type DashboardModule = {
  key: DashboardModuleKey;
  label: string;
  summary: string;
  signal?: boolean;
};

export type DashboardNavGroup = {
  label: "Control" | "Deploy" | "Data" | "System";
  modules: DashboardModule[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: "Control",
    modules: [
      { key: "overview", label: "Overview", summary: "Fleet command", signal: true },
      { key: "apps", label: "Apps", summary: "Local registry", signal: true },
      { key: "logs", label: "Logs", summary: "Runtime output" },
      { key: "health", label: "Health", summary: "Checks and failures" },
      { key: "metrics", label: "Metrics", summary: "Host and app samples" }
    ]
  },
  {
    label: "Deploy",
    modules: [
      { key: "deployments", label: "Deployments", summary: "Dockerfile releases" },
      { key: "domains", label: "Domains", summary: "DNS and proxy", signal: true },
      { key: "github", label: "GitHub", summary: "Repos and webhooks" },
      { key: "env", label: "Env", summary: "Secrets and pending state" }
    ]
  },
  {
    label: "Data",
    modules: [
      { key: "databases", label: "Databases", summary: "Compose data services", signal: true },
      { key: "backups", label: "Backups", summary: "Jobs and run history", signal: true }
    ]
  },
  {
    label: "System",
    modules: [{ key: "settings", label: "Settings", summary: "Notifications and server", signal: true }]
  }
];

export const DASHBOARD_MODULES = DASHBOARD_NAV_GROUPS.flatMap((group) => group.modules);

export function getDashboardModule(key: DashboardModuleKey): DashboardModule {
  return DASHBOARD_MODULES.find((module) => module.key === key) || DASHBOARD_MODULES[0];
}

export type ShellStatus = {
  connected: boolean;
  daemonUrl: string;
  loading: boolean;
  mode: string;
  refreshing: boolean;
  updated: string;
  workspace: string;
  onRefresh: () => void;
};

export type DashboardShellProps = {
  activeModule: DashboardModuleKey;
  children: ReactNode;
  status: ShellStatus;
  onSelect: (module: DashboardModuleKey) => void;
};
