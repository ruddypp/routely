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
  | "server"
  | "settings";

export type DashboardModule = {
  key: DashboardModuleKey;
  label: string;
  summary: string;
  signal?: boolean;
};

export type DashboardNavGroup = {
  label: "Operate" | "Release" | "Observe" | "Data" | "Node";
  modules: DashboardModule[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: "Operate",
    modules: [
      { key: "overview", label: "Overview", summary: "Local → one VPS", signal: true },
      { key: "apps", label: "Apps / Services", summary: "Registry + Start", signal: true }
    ]
  },
  {
    label: "Release",
    modules: [
      { key: "deployments", label: "Deployments", summary: "Dockerfile bridge" },
      { key: "domains", label: "Domains", summary: "DNS / proxy / TLS", signal: true },
      { key: "github", label: "GitHub", summary: "Signed push deploy" },
      { key: "env", label: "Env / Secrets", summary: "Redacted metadata" }
    ]
  },
  {
    label: "Observe",
    modules: [
      { key: "logs", label: "Logs", summary: "Local + deploy output" },
      { key: "health", label: "Health", summary: "Checks / failures" },
      { key: "metrics", label: "Metrics", summary: "Host + app samples" }
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
    label: "Node",
    modules: [
      { key: "server", label: "Server Status", summary: "One-VPS readiness", signal: true },
      { key: "settings", label: "Notifications / Settings", summary: "Alerts + deferred", signal: true }
    ]
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
