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
export function upsertApp(db: Database.Database, input: RoutelyAppInput): RoutelyAppRecord;
export function deleteApp(db: Database.Database, appId: number): boolean;
export function syncWorkspaceConfig(db: Database.Database, loaded: LoadedWorkspaceConfig | null): string[];
export function updateAppStatus(db: Database.Database, appId: number, status: RoutelyAppStatus): void;
export function recordRuntimeStart(db: Database.Database, appId: number, pid: number): void;
export function recordRuntimeStop(db: Database.Database, appId: number, pid: number, exitCode: number | null, status?: RoutelyAppStatus): void;
export function initializeRoutely(root: string): RoutelyDatabaseHandle;
