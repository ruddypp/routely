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
  | "server"
  | "settings";

export type DashboardModule = {
  key: DashboardModuleKey;
  label: string;
  summary: string;
  signal?: boolean;
};

export type DashboardNavGroup = {
  label: "Operate" | "Server";
  modules: DashboardModule[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: "Operate",
    modules: [
      { key: "overview", label: "Dashboard", summary: "Runtime host health", signal: true },
      { key: "apps", label: "Apps / Services", summary: "Project services", signal: true }
    ]
  },
  {
    label: "Server",
    modules: [
      { key: "server", label: "Server Status", summary: "Runtime host readiness", signal: true },
      { key: "settings", label: "Notifications / Settings", summary: "Alerts + deferred", signal: true }
    ]
  }
];


export const DASHBOARD_MODULES = DASHBOARD_NAV_GROUPS.flatMap((group) => group.modules);

export function getDashboardModule(key: DashboardModuleKey): DashboardModule {
  return DASHBOARD_MODULES.find((module) => module.key === key) || DASHBOARD_MODULES[0];
}

export type ServerRailTone = "ok" | "warn" | "error" | "muted";

export type ServerRailSignal = {
  label: string;
  value: string;
  detail?: string;
  tone: ServerRailTone;
};

export type ShellStatus = {
  connected: boolean;
  daemonUrl: string;
  docker: ServerRailSignal;
  compose: ServerRailSignal;
  cpu: ServerRailSignal;
  memory: ServerRailSignal;
  disk: ServerRailSignal;
  loading: boolean;
  mode: string;
  refreshing: boolean;
  updated: string;
  uptime: string;
  workspace: string;
  onRefresh: () => void;
};

export type DashboardShellProps = {
  activeModule: DashboardModuleKey;
  children: ReactNode;
  status: ShellStatus;
  onSelect: (module: DashboardModuleKey) => void;
};
