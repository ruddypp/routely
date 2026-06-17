import type Database from "better-sqlite3";
import type {
  LoadedWorkspaceConfig,
  RoutelyAppInput,
  RoutelyAppRecord,
  RoutelyAppStatus,
  RoutelyDeploymentLogRecord,
  RoutelyDeploymentRecord,
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
export function createDomain(db: Database.Database, input: { appId: number; hostname: string; targetPort?: number | null; verificationMessage?: string | null }): RoutelyDomainRecord;
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
