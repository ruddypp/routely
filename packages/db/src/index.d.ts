import type Database from "better-sqlite3";
import type {
  LoadedWorkspaceConfig,
  RoutelyAppInput,
  RoutelyAppEnvVarRecord,
  RoutelyAppRecord,
  RoutelyAppStatus,
  RoutelyDeploymentLogRecord,
  RoutelyDeploymentRecord,
  RoutelyHealthcheckRecord,
  RoutelyMetricSampleRecord,
  RoutelyDatabaseRecord,
  RoutelyBackupJobRecord,
  RoutelyBackupRunRecord,
  RoutelyNotificationAttemptRecord,
  RoutelyNotificationChannelRecord,
  RoutelyDeploymentStatus
} from "@routely/core";

export interface RoutelyDatabaseHandle {
  db: Database.Database;
  databasePath: string;
  dataDir: string;
}

export const routelyDbVersion: string;
export function resolveDataDir(root: string, dataDir?: string): string;
export function resolveDatabasePath(root: string): string;
export function openRoutelyDatabase(root: string): RoutelyDatabaseHandle;
export function migrate(db: Database.Database): void;
export function listApps(db: Database.Database): RoutelyAppRecord[];
export function getAppByName(db: Database.Database, name: string): RoutelyAppRecord | null;
export function getAppById(db: Database.Database, appId: number): RoutelyAppRecord | null;
export interface RunningRuntimeInstanceRecord {
  id: number;
  app_id: number;
  app_name: string;
  pid: number | null;
  status: string;
  started_at: string | null;
  stopped_at: string | null;
  exit_code: number | null;
  updated_at: string;
}
export function listRunningRuntimeInstances(db: Database.Database): RunningRuntimeInstanceRecord[];
export function reconcileStaleRuntimeInstances(
  db: Database.Database,
  isPidAlive?: (pid: number) => boolean
): RunningRuntimeInstanceRecord[];
export function upsertApp(db: Database.Database, input: RoutelyAppInput): RoutelyAppRecord;
export function updateApp(db: Database.Database, appId: number, input: Partial<RoutelyAppInput>): RoutelyAppRecord | null;
export function deleteApp(db: Database.Database, appId: number): boolean;
export function syncWorkspaceConfig(db: Database.Database, loaded: LoadedWorkspaceConfig | null): string[];
export function updateAppStatus(db: Database.Database, appId: number, status: RoutelyAppStatus): void;
export function listAppEnvVars(db: Database.Database, appId: number): RoutelyAppEnvVarRecord[];
export function getAppEnvVar(db: Database.Database, appId: number, key: string): RoutelyAppEnvVarRecord | null;
export function upsertAppEnvVar(
  db: Database.Database,
  appId: number,
  input: { key?: string; value?: unknown; isSecret?: boolean; scope?: string }
): RoutelyAppEnvVarRecord | null;
export function deleteAppEnvVar(db: Database.Database, appId: number, key: string): boolean;
export function clearAppEnvPendingFlags(db: Database.Database, appId: number, flags?: { restart?: boolean; redeploy?: boolean }): RoutelyAppEnvVarRecord[];
export function appEnvPendingState(db: Database.Database, appId: number): { count: number; needsRestart: boolean; needsRedeploy: boolean };
export function listSecretValuesForApp(db: Database.Database, appId: number): string[];
export function recordRuntimeStart(db: Database.Database, appId: number, pid: number): void;
export function recordRuntimeStop(db: Database.Database, appId: number, pid: number, exitCode: number | null, status?: RoutelyAppStatus): void;
export function createDeployment(
  db: Database.Database,
  input: {
    appId: number;
    source?: { type?: string | null; repo?: string | null; branch?: string | null; commitSha?: string | null };
    previous?: { imageTag?: string | null; containerName?: string | null };
    containerPort?: number | null;
    hostPort?: number | null;
  }
): RoutelyDeploymentRecord;
export function getDeploymentById(db: Database.Database, deploymentId: number): RoutelyDeploymentRecord | null;
export function listDeployments(db: Database.Database, options?: { limit?: number }): RoutelyDeploymentRecord[];
export function listDeploymentsForApp(db: Database.Database, appId: number, options?: { limit?: number }): RoutelyDeploymentRecord[];
export function getLatestSuccessfulDeploymentForApp(db: Database.Database, appId: number): RoutelyDeploymentRecord | null;
export function getActiveDeploymentForApp(db: Database.Database, appId: number): RoutelyDeploymentRecord | null;
export function updateDeployment(
  db: Database.Database,
  deploymentId: number,
  patch: {
    status?: RoutelyDeploymentStatus;
    phase?: string;
    imageTag?: string | null;
    containerName?: string | null;
    hostPort?: number | null;
    containerPort?: number | null;
    errorMessage?: string | null;
    finishedAt?: string | null;
  }
): RoutelyDeploymentRecord | null;
export function appendDeploymentLog(
  db: Database.Database,
  deploymentId: number,
  input: { phase?: string; stream?: string; message: string }
): RoutelyDeploymentLogRecord;
export function listDeploymentLogs(
  db: Database.Database,
  deploymentId: number,
  options?: { afterSequence?: number; limit?: number }
): RoutelyDeploymentLogRecord[];
export function upsertHealthcheckResult(
  db: Database.Database,
  input: {
    appId?: number;
    app_id?: number;
    deploymentId?: number | null;
    deployment_id?: number | null;
    target?: string;
    path?: string | null;
    expectedStatus?: number | null;
    expected_status?: number | null;
    status?: string;
    httpStatus?: number | null;
    responseTimeMs?: number | null;
    message?: string | null;
  }
): RoutelyHealthcheckRecord;
export function getHealthcheckForApp(db: Database.Database, appId: number, target?: string): RoutelyHealthcheckRecord | null;
export function listHealthchecksForApp(db: Database.Database, appId: number): RoutelyHealthcheckRecord[];
export function recordMetricSample(
  db: Database.Database,
  input?: {
    appId?: number | null;
    app_id?: number | null;
    deploymentId?: number | null;
    deployment_id?: number | null;
    scope?: string;
    cpuPercent?: number | null;
    memoryBytes?: number | null;
    memoryLimitBytes?: number | null;
    diskUsedBytes?: number | null;
    diskTotalBytes?: number | null;
    networkRxBytes?: number | null;
    networkTxBytes?: number | null;
    message?: string | null;
  }
): RoutelyMetricSampleRecord;
export function listMetricSamplesForApp(db: Database.Database, appId: number, options?: { limit?: number }): RoutelyMetricSampleRecord[];
export function listHostMetricSamples(db: Database.Database, options?: { limit?: number }): RoutelyMetricSampleRecord[];
export function listDatabases(db: Database.Database): RoutelyDatabaseRecord[];
export function getDatabaseById(db: Database.Database, databaseId: number): RoutelyDatabaseRecord | null;
export function getDatabaseByName(db: Database.Database, name: string): RoutelyDatabaseRecord | null;
export function upsertDatabase(
  db: Database.Database,
  input: {
    appId?: number | null;
    app_id?: number | null;
    name?: string;
    type?: string;
    preset?: string;
    status?: string;
    internal?: boolean;
    allowPublic?: boolean;
    allow_public?: boolean;
    image?: string | null;
    port?: number | string | null;
    composeService?: string | null;
    compose_service?: string | null;
    composeFile?: string | null;
    compose_file?: string | null;
    volumeName?: string | null;
    volume_name?: string | null;
    env?: Record<string, string>;
  }
): RoutelyDatabaseRecord;
export function updateDatabaseStatus(db: Database.Database, databaseId: number, status: string): RoutelyDatabaseRecord | null;
export function upsertBackupJob(
  db: Database.Database,
  input: { databaseId?: number; database_id?: number; enabled?: boolean; schedule?: string | null; retentionDays?: number; retention_days?: number; localDir?: string | null; local_dir?: string | null }
): RoutelyBackupJobRecord;
export function getBackupJobById(db: Database.Database, backupJobId: number): RoutelyBackupJobRecord | null;
export function getBackupJobForDatabase(db: Database.Database, databaseId: number): RoutelyBackupJobRecord | null;
export function listBackupJobs(db: Database.Database): RoutelyBackupJobRecord[];
export function listDueBackupJobs(db: Database.Database, isDue: (schedule: string, lastRunAt: string | null) => boolean): RoutelyBackupJobRecord[];
export function createBackupRun(db: Database.Database, input: { backupJobId?: number; backup_job_id?: number; trigger?: string; message?: string | null }): RoutelyBackupRunRecord;
export function updateBackupRun(
  db: Database.Database,
  backupRunId: number,
  patch: { status?: string; filePath?: string | null; file_path?: string | null; sizeBytes?: number | null; size_bytes?: number | null; message?: string | null; finishedAt?: string | null; finished_at?: string | null }
): RoutelyBackupRunRecord | null;
export function getBackupRunById(db: Database.Database, backupRunId: number): RoutelyBackupRunRecord | null;
export function listBackupRuns(db: Database.Database, options?: { limit?: number }): RoutelyBackupRunRecord[];
export function listBackupRunsForJob(db: Database.Database, backupJobId: number, options?: { limit?: number }): RoutelyBackupRunRecord[];
export function markBackupRunsPruned(db: Database.Database, runIds?: number[]): RoutelyBackupRunRecord[];
export function listNotificationChannels(db: Database.Database): RoutelyNotificationChannelRecord[];
export function listEnabledNotificationChannelsForEvent(db: Database.Database, event: string): RoutelyNotificationChannelRecord[];
export function getNotificationChannelById(db: Database.Database, channelId: number): RoutelyNotificationChannelRecord | null;
export function upsertNotificationChannel(db: Database.Database, input?: Record<string, unknown>): RoutelyNotificationChannelRecord;
export function deleteNotificationChannel(db: Database.Database, channelId: number): boolean;
export function createNotificationAttempt(
  db: Database.Database,
  input?: { channelId?: number | null; channel_id?: number | null; event?: string; target?: string | null; resourceType?: string | null; resource_type?: string | null; resourceId?: number | null; resource_id?: number | null; message?: string | null }
): RoutelyNotificationAttemptRecord;
export function updateNotificationAttempt(
  db: Database.Database,
  attemptId: number,
  patch?: { status?: string; httpStatus?: number | null; http_status?: number | null; message?: string | null; finishedAt?: string | null; finished_at?: string | null }
): RoutelyNotificationAttemptRecord | null;
export function getNotificationAttemptById(db: Database.Database, attemptId: number): RoutelyNotificationAttemptRecord | null;
export function listNotificationAttempts(db: Database.Database, options?: { limit?: number }): RoutelyNotificationAttemptRecord[];
export interface RoutelyDomainRecord {
  id: number;
  app_id: number;
  app_name?: string | null;
  app_type?: string | null;
  app_internal?: 0 | 1 | boolean | null;
  hostname: string;
  status: string;
  dns_status: string;
  tls_status: string;
  target_port: number | null;
  verification_message: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface RoutelyProxyRouteRecord {
  id: number;
  domain_id: number;
  app_id: number;
  deployment_id: number | null;
  hostname?: string;
  app_name?: string;
  domain_status?: string | null;
  dns_status?: string | null;
  tls_status?: string | null;
  router_name: string;
  service_name: string;
  target_url: string;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
export function listDomains(db: Database.Database): RoutelyDomainRecord[];
export function listDomainsForApp(db: Database.Database, appId: number): RoutelyDomainRecord[];
export function getDomainByHostname(db: Database.Database, hostname: string): RoutelyDomainRecord | null;
export function createDomain(
  db: Database.Database,
  input: {
    appId: number;
    hostname: string;
    status?: string;
    dnsStatus?: string;
    tlsStatus?: string;
    targetPort?: number | null;
    verificationMessage?: string | null;
  }
): RoutelyDomainRecord;
export function deleteDomain(db: Database.Database, hostname: string): boolean;
export function updateDomainVerification(
  db: Database.Database,
  hostname: string,
  input: { status?: string; dnsStatus?: string; tlsStatus?: string; targetPort?: number | null; verificationMessage?: string | null }
): RoutelyDomainRecord | null;
export function listProxyRoutes(db: Database.Database): RoutelyProxyRouteRecord[];
export function upsertProxyRoute(
  db: Database.Database,
  input: {
    domainId: number;
    appId: number;
    deploymentId?: number | null;
    routerName: string;
    serviceName: string;
    targetUrl: string;
    config?: Record<string, unknown>;
    enabled?: boolean;
  }
): RoutelyProxyRouteRecord | null;
export function deleteProxyRouteForDomain(db: Database.Database, hostname: string): boolean;
export interface RoutelyGithubInstallationRecord {
  id: number;
  installation_id: number;
  account_login: string;
  account_type: string | null;
  app_id: string | null;
  target_type: string | null;
  permissions: Record<string, unknown>;
  events: string[];
  status: string;
  created_at: string;
  updated_at: string;
}
export interface RoutelyGithubRepositoryRecord {
  id: number;
  installation_id: number | null;
  github_repository_id: number | null;
  full_name: string;
  owner: string;
  name: string;
  private: boolean;
  default_branch: string | null;
  html_url: string | null;
  connected_app_id: number | null;
  connected_app_name?: string | null;
  selected_branch: string | null;
  auto_deploy_enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface RoutelyGithubWebhookDeliveryRecord {
  delivery_id: string;
  event: string;
  action: string | null;
  status: string;
  signature_valid: boolean;
  app_id: number | null;
  app_name?: string | null;
  deployment_id: number | null;
  repo: string | null;
  branch: string | null;
  commit_sha: string | null;
  message: string | null;
  received_at: string;
  processed_at: string | null;
  updated_at: string;
}
export function listGithubInstallations(db: Database.Database): RoutelyGithubInstallationRecord[];
export function upsertGithubInstallation(db: Database.Database, input: Record<string, unknown>): RoutelyGithubInstallationRecord;
export function getGithubInstallationByInstallationId(db: Database.Database, installationId: number): RoutelyGithubInstallationRecord | null;
export function listGithubRepositories(db: Database.Database): RoutelyGithubRepositoryRecord[];
export function getGithubRepositoryByFullName(db: Database.Database, fullName: string): RoutelyGithubRepositoryRecord | null;
export function upsertGithubRepository(db: Database.Database, input: Record<string, unknown>): RoutelyGithubRepositoryRecord;
export function connectAppToGithubRepository(
  db: Database.Database,
  appId: number,
  input: Record<string, unknown>
): { app: RoutelyAppRecord; repository: RoutelyGithubRepositoryRecord } | null;
export function getGithubSourceForApp(
  db: Database.Database,
  appId: number
): { app: RoutelyAppRecord | null; source: Record<string, unknown> | null; repository: RoutelyGithubRepositoryRecord | null };
export function listGithubConnectedAppsForPush(db: Database.Database, push: { repo: string; branch: string }): RoutelyAppRecord[];
export function recordGithubWebhookDelivery(
  db: Database.Database,
  input: Record<string, unknown>
): { inserted: boolean; delivery: RoutelyGithubWebhookDeliveryRecord | null };
export function updateGithubWebhookDelivery(
  db: Database.Database,
  deliveryId: string,
  patch: Record<string, unknown>
): RoutelyGithubWebhookDeliveryRecord | null;
export function getGithubWebhookDelivery(db: Database.Database, deliveryId: string): RoutelyGithubWebhookDeliveryRecord | null;
export function listGithubWebhookDeliveries(db: Database.Database, options?: { limit?: number }): RoutelyGithubWebhookDeliveryRecord[];
export function getSetting(db: Database.Database, key: string): string | null;
export function setSetting(db: Database.Database, key: string, value: string): void;
export interface RoutelyServerFoundationState {
  mode: "local" | "production" | string;
  production: boolean;
  dataDir: string | null;
  initializedAt: string | null;
  auth: {
    required: boolean;
    configured: boolean;
    tokenHash: string | null;
    tokenSalt: string | null;
    tokenCreatedAt: string | null;
  };
  lastDoctor: Record<string, unknown> | null;
}
export function getServerFoundationState(db: Database.Database): RoutelyServerFoundationState;
export function saveServerFoundationState(
  db: Database.Database,
  state: {
    mode?: string;
    dataDir?: string;
    initializedAt?: string;
    adminTokenHash?: string;
    adminTokenSalt?: string;
    adminTokenCreatedAt?: string;
    lastDoctor?: Record<string, unknown>;
  }
): RoutelyServerFoundationState;
export function initializeRoutely(root: string): RoutelyDatabaseHandle;
