import type Database from "better-sqlite3";
import type {
  LoadedWorkspaceConfig,
  RoutelyAppInput,
  RoutelyAppRecord,
  RoutelyAppStatus
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
