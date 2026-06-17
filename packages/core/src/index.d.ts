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
  install?: string | null;
  dev?: string | null;
  build?: string | null;
  start?: string | null;
  env?: Record<string, string | number | boolean | null> | null;
  port?: number | string | null;
  depends_on?: string[] | string | null;
  healthcheck?: { path?: string | null; expected_status?: number | string | null } | null;
  domains?: string[] | string | null;
  source?: { type?: string | null; repo?: string | null; branch?: string | null } | null;
  image?: string | null;
  internal?: boolean;
  volumes?: string[] | string | null;
  compose_file?: string | null;
  compose_service?: string | null;
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
  install: string | null;
  dev: string | null;
  build: string | null;
  start: string | null;
  env: Record<string, string>;
  port: number | null;
  depends_on: string[];
  healthcheck: { path: string | null; expected_status: number | null } | null;
  domains: string[];
  source: { type: string | null; repo: string | null; branch: string | null } | null;
  image: string | null;
  internal: boolean;
  volumes: string[];
  compose_file: string | null;
  compose_service: string | null;
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
  install: string | null;
  dev: string | null;
  build: string | null;
  start: string | null;
  env: Record<string, string>;
  port: number | null;
  depends_on: string[];
  healthcheck: { path: string | null; expected_status: number | null } | null;
  domains: string[];
  source: { type: string | null; repo: string | null; branch: string | null } | null;
  image: string | null;
  internal: 0 | 1 | boolean;
  volumes: string[];
  compose_file: string | null;
  compose_service: string | null;
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
  install: string | null;
  dev: string | null;
  build: string | null;
  start: string | null;
  env: Record<string, string>;
  port: number | null;
  dependsOn: string[];
  healthcheck: { path: string | null; expected_status: number | null } | null;
  domains: string[];
  source: { type: string | null; repo: string | null; branch: string | null } | null;
  image: string | null;
  internal: boolean;
  volumes: string[];
  composeFile: string | null;
  composeService: string | null;
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
export function appToConfigEntry(input: RoutelyAppInput): Record<string, unknown>;
export function filterExportableEnv(env?: Record<string, string>): Record<string, string>;

export const WORKSPACE_CONFIG_FILENAMES: string[];
export function resolveWorkspaceConfigPath(root: string): string | null;
export interface LoadedWorkspaceConfig {
  config: RoutelyWorkspaceConfig;
  configPath: string;
}
export function loadWorkspaceConfig(root: string): LoadedWorkspaceConfig | null;
export function readRawWorkspaceConfig(root: string): { configPath: string; raw: Record<string, unknown> };
export function upsertWorkspaceConfigEntry(
  root: string,
  input: RoutelyAppInput,
  sectionName?: "apps" | "services"
): { configPath: string; entry: Record<string, unknown>; section: string };

export type RoutelyServerMode = "local" | "production";
export type RoutelyServerCheckStatus = "ok" | "warn" | "error";
export interface RoutelyServerCheck {
  id: string;
  label: string;
  status: RoutelyServerCheckStatus;
  message: string;
  detail: string | null;
}
export interface RoutelyServerDoctorResult {
  ok: boolean;
  dataDir: string;
  ports: number[];
  checkedAt: string;
  checks: RoutelyServerCheck[];
}
export const SERVER_MODE_LOCAL: "local";
export const SERVER_MODE_PRODUCTION: "production";
export const DEFAULT_PRODUCTION_PORTS: number[];
export function defaultProductionDataDir(workspaceRoot?: string): string;
export function generateAdminToken(): string;
export function hashAdminToken(token: string, salt?: string): { salt: string; hash: string };
export function verifyAdminToken(token: string, salt?: string | null, expectedHash?: string | null): boolean;
export function runServerDoctorChecks(options?: {
  workspaceRoot?: string;
  dataDir?: string;
  ports?: number[];
  createDataDir?: boolean;
}): Promise<RoutelyServerDoctorResult>;
