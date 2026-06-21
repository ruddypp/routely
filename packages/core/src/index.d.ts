export type RoutelyAppType = "app" | "database" | "compose" | "static" | "worker";
export type RoutelyAppDriver = "command" | "compose" | "dockerfile" | "buildpack" | "static";
export type RoutelyAppStatus = "stopped" | "running" | "starting" | "crashed" | "unknown";
export type RoutelyDeploymentStatus = "queued" | "preparing" | "building" | "starting" | "healthchecking" | "succeeded" | "failed";
export type RoutelyDatabaseType = "postgres" | "mysql" | "mariadb" | "redis" | "mongodb";
export type RoutelyBackupRunStatus = "queued" | "running" | "succeeded" | "failed" | "pruned";
export type RoutelyNotificationChannelType = "webhook" | "discord" | "telegram";
export type RoutelyNotificationEvent = "deploy_succeeded" | "deploy_failed" | "backup_failed";

export const NOTIFICATION_CHANNEL_TYPES: RoutelyNotificationChannelType[];
export const NOTIFICATION_EVENTS: RoutelyNotificationEvent[];

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
  ports?: Array<number | string> | number | string | null;
  depends_on?: string[] | string | null;
  healthcheck?: { path?: string | null; expected_status?: number | string | null } | null;
  domains?: string[] | string | null;
  source?: {
    type?: string | null;
    repo?: string | null;
    branch?: string | null;
    auto_deploy?: { enabled?: boolean; branches?: string[] | string | null } | null;
    autoDeploy?: { enabled?: boolean; branches?: string[] | string | null } | null;
  } | null;
  image?: string | null;
  internal?: boolean;
  volumes?: string[] | string | null;
  compose_file?: string | null;
  composeFile?: string | null;
  compose_service?: string | null;
  composeService?: string | null;
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
  ports: number[];
  depends_on: string[];
  healthcheck: { path: string | null; expected_status: number | null } | null;
  domains: string[];
  source: { type: string | null; repo: string | null; branch: string | null; auto_deploy?: { enabled: boolean; branches: string[] } } | null;
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
  envKeys: string[];
  port: number | null;
  ports: number[];
  depends_on: string[];
  healthcheck: { path: string | null; expected_status: number | null } | null;
  domains: string[];
  source: { type: string | null; repo: string | null; branch: string | null; auto_deploy?: { enabled: boolean; branches: string[] } } | null;
  image: string | null;
  internal: boolean;
  volumes: string[];
  compose_file: string | null;
  compose_service: string | null;
  needs_restart?: boolean;
  needs_redeploy?: boolean;
  enabled: boolean;
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
  envKeys: string[];
  port: number | null;
  ports: number[];
  dependsOn: string[];
  healthcheck: { path: string | null; expected_status: number | null } | null;
  domains: string[];
  source: { type: string | null; repo: string | null; branch: string | null; auto_deploy?: { enabled: boolean; branches: string[] } } | null;
  image: string | null;
  internal: boolean;
  volumes: string[];
  composeFile: string | null;
  composeService: string | null;
  needsRestart?: boolean;
  needsRedeploy?: boolean;
  enabled: boolean;
  status: RoutelyAppStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RoutelyDeploymentRecord {
  id: number;
  app_id: number;
  app_name?: string | null;
  source_type: string | null;
  repo: string | null;
  branch: string | null;
  commit_sha: string | null;
  status: RoutelyDeploymentStatus;
  phase: string;
  image_tag: string | null;
  container_name: string | null;
  previous_image_tag: string | null;
  previous_container_name: string | null;
  host_port: number | null;
  container_port: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutelyDeploymentDto {
  id: number;
  appId: number;
  appName: string | null;
  status: RoutelyDeploymentStatus;
  phase: string;
  sourceType: string | null;
  repo: string | null;
  branch: string | null;
  commitSha: string | null;
  imageTag: string | null;
  containerName: string | null;
  previousImageTag: string | null;
  previousContainerName: string | null;
  hostPort: number | null;
  containerPort: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutelyDeploymentLogRecord {
  id: number;
  deployment_id: number;
  sequence: number;
  phase: string;
  stream: string;
  message: string;
  created_at: string;
}

export interface RoutelyDeploymentLogDto {
  id: number;
  deploymentId: number;
  sequence: number;
  phase: string;
  stream: string;
  message: string;
  createdAt: string;
}

export interface RoutelyNotificationChannelRecord {
  id: number;
  name: string;
  type: RoutelyNotificationChannelType;
  enabled: boolean | 0 | 1;
  events: RoutelyNotificationEvent[];
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface RoutelyNotificationChannelDto {
  id: number;
  name: string;
  type: RoutelyNotificationChannelType;
  enabled: boolean;
  events: RoutelyNotificationEvent[];
  target: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutelyNotificationAttemptRecord {
  id: number;
  channel_id: number | null;
  channel_name?: string | null;
  channel_type?: RoutelyNotificationChannelType | string | null;
  event: RoutelyNotificationEvent | string;
  status: string;
  http_status: number | null;
  message: string | null;
  target: string | null;
  resource_type: string | null;
  resource_id: number | null;
  created_at: string;
  finished_at: string | null;
}

export interface RoutelyNotificationAttemptDto {
  id: number;
  channelId: number | null;
  channelName: string | null;
  channelType: string | null;
  event: string;
  status: string;
  httpStatus: number | null;
  message: string | null;
  target: string | null;
  resourceType: string | null;
  resourceId: number | null;
  createdAt: string;
  finishedAt: string | null;
}

export function normalizeNotificationChannelInput(input?: Record<string, unknown>): {
  name: string;
  type: RoutelyNotificationChannelType;
  enabled: boolean;
  events: RoutelyNotificationEvent[];
  config: Record<string, string>;
};
export function notificationChannelToPublicDto(row: RoutelyNotificationChannelRecord): RoutelyNotificationChannelDto;
export function notificationAttemptToPublicDto(row: RoutelyNotificationAttemptRecord): RoutelyNotificationAttemptDto;
export function buildNotificationMessage(event: string, context?: Record<string, unknown>): string;
export function buildNotificationPayload(channel: RoutelyNotificationChannelRecord, event: string, context?: Record<string, unknown>): Record<string, unknown>;

export interface RoutelyHealthcheckRecord {
  id: number;
  app_id: number;
  deployment_id: number | null;
  target: string;
  path: string | null;
  expected_status: number | null;
  last_status: string | null;
  last_http_status: number | null;
  last_response_time_ms: number | null;
  last_message: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutelyHealthcheckDto {
  id: number;
  appId: number;
  deploymentId: number | null;
  target: string;
  path: string | null;
  expectedStatus: number | null;
  status: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  message: string | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutelyMetricSampleRecord {
  id: number;
  app_id: number | null;
  deployment_id: number | null;
  scope: string;
  cpu_percent: number | null;
  memory_bytes: number | null;
  memory_limit_bytes: number | null;
  disk_used_bytes: number | null;
  disk_total_bytes: number | null;
  network_rx_bytes: number | null;
  network_tx_bytes: number | null;
  message: string | null;
  sampled_at: string;
}

export interface RoutelyMetricSampleDto {
  id: number;
  appId: number | null;
  deploymentId: number | null;
  scope: string;
  cpuPercent: number | null;
  memoryBytes: number | null;
  memoryLimitBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  message: string | null;
  sampledAt: string;
}

export interface RoutelyDatabaseRecord {
  id: number;
  app_id: number | null;
  app_name?: string | null;
  name: string;
  type: RoutelyDatabaseType | string;
  status: string;
  internal: 0 | 1 | boolean;
  image: string | null;
  port: number | null;
  compose_service: string | null;
  compose_file: string | null;
  volume_name: string | null;
  env: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface RoutelyDatabaseDto {
  id: number;
  appId: number | null;
  appName: string | null;
  name: string;
  type: string;
  status: string;
  internal: boolean;
  image: string | null;
  port: number | null;
  composeService: string | null;
  composeFile: string | null;
  volumeName: string | null;
  envKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutelyBackupJobRecord {
  id: number;
  database_id: number;
  database_name?: string | null;
  database_type?: string | null;
  enabled: 0 | 1 | boolean;
  schedule: string | null;
  retention_days: number;
  local_dir: string | null;
  last_run_status?: string | null;
  last_run_at?: string | null;
  last_run_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutelyBackupRunRecord {
  id: number;
  backup_job_id: number;
  database_id: number;
  database_name?: string | null;
  database_type?: string | null;
  status: RoutelyBackupRunStatus | string;
  trigger: string;
  file_path: string | null;
  size_bytes: number | null;
  message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutelyBackupJobDto {
  id: number;
  databaseId: number;
  databaseName: string | null;
  databaseType: string | null;
  enabled: boolean;
  schedule: string | null;
  retentionDays: number;
  localDir: string | null;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  lastRunMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutelyBackupRunDto {
  id: number;
  backupJobId: number;
  databaseId: number;
  databaseName: string | null;
  databaseType: string | null;
  status: string;
  trigger: string;
  filePath: string | null;
  sizeBytes: number | null;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function databaseToPublicDto(row: RoutelyDatabaseRecord): RoutelyDatabaseDto;
export function backupJobToPublicDto(row: RoutelyBackupJobRecord): RoutelyBackupJobDto;
export function backupRunToPublicDto(row: RoutelyBackupRunRecord): RoutelyBackupRunDto;
export function normalizeDatabaseType(type: unknown): RoutelyDatabaseType;
export function normalizeBackupSchedule(schedule: unknown): string | null;
export function backupScheduleDue(schedule: unknown, now?: Date, lastRunAt?: string | null): boolean;
export function selectBackupRunsForRetention<T extends { status: string; file_path?: string | null; filePath?: string | null; finished_at?: string | null; finishedAt?: string | null; updated_at?: string | null; updatedAt?: string | null }>(runs: T[], retentionDays?: number, now?: Date): T[];

export interface RoutelyAppEnvVarRecord {
  id: number;
  app_id: number;
  key: string;
  value: string;
  is_secret: 0 | 1 | boolean;
  scope: "all" | "local" | "production" | string;
  needs_restart: 0 | 1 | boolean;
  needs_redeploy: 0 | 1 | boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutelyAppEnvVarDto {
  id: number;
  appId: number;
  key: string;
  value: string | null;
  displayValue: string;
  isSecret: boolean;
  scope: string;
  needsRestart: boolean;
  needsRedeploy: boolean;
  createdAt: string;
  updatedAt: string;
}

export const routelyCoreVersion: string;
export const DEFAULT_DASHBOARD_PORT: number;
export const DEFAULT_DAEMON_PORT: number;
export const APP_TYPES: RoutelyAppType[];
export const APP_DRIVERS: RoutelyAppDriver[];
export const APP_STATUSES: RoutelyAppStatus[];
export const DEPLOYMENT_STATUSES: RoutelyDeploymentStatus[];
export function normalizeWorkspaceConfig(input?: RoutelyWorkspaceConfigInput): RoutelyWorkspaceConfig;
export function normalizeAppInput(input: RoutelyAppInput): NormalizedRoutelyAppInput;
export function appToPublicDto(app: RoutelyAppRecord): RoutelyAppDto;
export function deploymentToPublicDto(deployment: RoutelyDeploymentRecord): RoutelyDeploymentDto;
export function deploymentLogToPublicDto(log: RoutelyDeploymentLogRecord): RoutelyDeploymentLogDto;
export function healthcheckToPublicDto(row: RoutelyHealthcheckRecord): RoutelyHealthcheckDto;
export function metricSampleToPublicDto(row: RoutelyMetricSampleRecord): RoutelyMetricSampleDto;
export function evaluateHttpHealthcheck(input?: {
  expectedStatus?: number | null;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  error?: unknown;
}): { status: string; httpStatus: number | null; responseTimeMs: number | null; message: string };
export function evaluateRuntimeHealth(input?: { running?: boolean; message?: string }): { status: string; message: string };
export function formatSseEvent(event: string, data: unknown, options?: { id?: string | number | null }): string;
export function isSecretEnvKey(key: string): boolean;
export function normalizeEnvKey(key: string): string;
export function normalizeAppEnvInput(input?: { key?: string; value?: unknown; isSecret?: boolean; scope?: string }): {
  key: string;
  value: string;
  isSecret: boolean;
  scope: string;
};
export function appEnvVarToPublicDto(row: RoutelyAppEnvVarRecord): RoutelyAppEnvVarDto;
export function mergeAppEnv(baseEnv?: Record<string, string>, storedEnvRows?: RoutelyAppEnvVarRecord[], options?: { scope?: string }): Record<string, string>;
export function redactSecrets(value: unknown, secrets?: string[]): string;
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
  dashboardPort?: number;
  createDataDir?: boolean;
}): Promise<RoutelyServerDoctorResult>;
