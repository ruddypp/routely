export type RoutelyAppType = "app" | "database" | "compose" | "static" | "worker";
export type RoutelyAppDriver = "command" | "compose" | "dockerfile" | "buildpack" | "static";
export type RoutelyAppStatus = "stopped" | "running" | "starting" | "crashed" | "unknown";

export interface RoutelyDashboardConfig {
  port?: number;
}

export interface RoutelyDaemonConfig {
  port?: number;
}

export interface RoutelyAppInput {
  name: string;
  server_id?: number;
  type?: RoutelyAppType;
  preset?: string;
  driver?: RoutelyAppDriver;
  path?: string | null;
  command?: string | null;
  dev?: string | null;
  port?: number | string | null;
  depends_on?: string[] | string | null;
  enabled?: boolean;
  status?: RoutelyAppStatus;
}

export interface RoutelyWorkspaceConfigInput {
  version?: number;
  name?: string;
  dashboard?: RoutelyDashboardConfig;
  daemon?: RoutelyDaemonConfig;
  apps?: RoutelyAppInput[];
  services?: RoutelyAppInput[];
}

export interface RoutelyWorkspaceConfig {
  version: number;
  name: string;
  dashboard: { port: number };
  daemon: { port: number };
  apps: NormalizedRoutelyAppInput[];
  services: NormalizedRoutelyAppInput[];
}

export interface NormalizedRoutelyAppInput {
  name: string;
  server_id: number;
  type: RoutelyAppType;
  preset: string;
  driver: RoutelyAppDriver;
  path: string | null;
  command: string | null;
  port: number | null;
  depends_on: string[];
  enabled: boolean;
  status: RoutelyAppStatus;
}

export interface RoutelyAppRecord {
  id: number;
  server_id: number;
  name: string;
  type: RoutelyAppType;
  preset: string;
  driver: RoutelyAppDriver;
  path: string | null;
  command: string | null;
  port: number | null;
  depends_on: string[];
  enabled: 0 | 1 | boolean;
  status: RoutelyAppStatus;
  created_at: string;
  updated_at: string;
}

export interface RoutelyAppDto {
  id: number;
  serverId: number;
  name: string;
  type: RoutelyAppType;
  preset: string;
  driver: RoutelyAppDriver;
  path: string | null;
  command: string | null;
  port: number | null;
  dependsOn: string[];
  enabled: boolean;
  status: RoutelyAppStatus;
  createdAt: string;
  updatedAt: string;
}

export const routelyCoreVersion: string;
export const DEFAULT_DASHBOARD_PORT: number;
export const DEFAULT_DAEMON_PORT: number;
export const APP_TYPES: RoutelyAppType[];
export const APP_DRIVERS: RoutelyAppDriver[];
export const APP_STATUSES: RoutelyAppStatus[];
export function normalizeWorkspaceConfig(input?: RoutelyWorkspaceConfigInput): RoutelyWorkspaceConfig;
export function normalizeAppInput(input: RoutelyAppInput): NormalizedRoutelyAppInput;
export function appToPublicDto(app: RoutelyAppRecord): RoutelyAppDto;

export const WORKSPACE_CONFIG_FILENAMES: string[];
export function resolveWorkspaceConfigPath(root: string): string | null;
export interface LoadedWorkspaceConfig {
  config: RoutelyWorkspaceConfig;
  configPath: string;
}
export function loadWorkspaceConfig(root: string): LoadedWorkspaceConfig | null;
