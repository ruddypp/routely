import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { normalizeAppInput } from "@routely/core";

export const routelyDbVersion = "0.1.0";

export function resolveDataDir(root, dataDir = process.env.ROUTELY_DATA_DIR || ".routely") {
  return resolve(root, dataDir);
}

export function resolveDatabasePath(root) {
  if (process.env.ROUTELY_DATABASE_URL?.startsWith("file:")) {
    return resolve(root, process.env.ROUTELY_DATABASE_URL.slice(5));
  }

  return resolve(resolveDataDir(root), "routely.db");
}

export function openRoutelyDatabase(root) {
  const dataDir = resolveDataDir(root);
  const databasePath = resolveDatabasePath(root);

  mkdirSync(dataDir, { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);

  return { db, databasePath, dataDir };
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'local',
      status TEXT NOT NULL DEFAULT 'unknown',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'app',
      preset TEXT NOT NULL DEFAULT 'custom',
      driver TEXT NOT NULL DEFAULT 'command',
      path TEXT,
      command TEXT,
      port INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'stopped',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS runtime_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      pid INTEGER,
      status TEXT NOT NULL DEFAULT 'unknown',
      started_at TEXT,
      stopped_at TEXT,
      exit_code INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing(db, "apps", "server_id", "INTEGER");

  db.prepare(`
    INSERT OR IGNORE INTO servers (id, name, kind, status)
    VALUES (1, 'local', 'local', 'running')
  `).run();
  db.prepare("UPDATE apps SET server_id = 1 WHERE server_id IS NULL").run();
}

function addColumnIfMissing(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    } catch (error) {
      if (!String(error?.message || error).includes("duplicate column name")) {
        throw error;
      }
    }
  }
}

export function listApps(db) {
  return db.prepare("SELECT * FROM apps ORDER BY name ASC").all();
}

export function getAppByName(db, name) {
  return db.prepare("SELECT * FROM apps WHERE name = ?").get(name) || null;
}

export function upsertApp(db, input) {
  const app = normalizeAppInput(input);
  const existing = getAppByName(db, app.name);

  if (existing) {
    db.prepare(`
      UPDATE apps
      SET server_id = ?, type = ?, preset = ?, driver = ?, path = ?, command = ?, port = ?, enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `).run(
      app.server_id,
      app.type,
      app.preset,
      app.driver,
      app.path,
      app.command,
      app.port,
      app.enabled ? 1 : 0,
      app.status,
      app.name
    );
  } else {
    db.prepare(`
      INSERT INTO apps (server_id, name, type, preset, driver, path, command, port, enabled, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.server_id,
      app.name,
      app.type,
      app.preset,
      app.driver,
      app.path,
      app.command,
      app.port,
      app.enabled ? 1 : 0,
      app.status
    );
  }

  return getAppByName(db, app.name);
}

/**
 * Synchronize a loaded workspace config (routely.yml) into the apps table.
 *
 * - Apps and services defined in the config are upserted.
 * - Relative `path` values are resolved against the config file's directory so
 *   the registry always stores absolute paths.
 * - Runtime `status` of an already-known app is preserved; config only changes
 *   declarative fields (driver, command, port, etc.), never live state.
 *
 * Returns the list of synced app names.
 */
export function syncWorkspaceConfig(db, loaded) {
  if (!loaded || !loaded.config) {
    return [];
  }

  const baseDir = loaded.configPath ? dirname(loaded.configPath) : process.cwd();
  const entries = [...(loaded.config.apps || []), ...(loaded.config.services || [])];
  const synced = [];

  const apply = db.transaction((items) => {
    for (const item of items) {
      const existing = getAppByName(db, item.name);
      const resolvedPath =
        item.path && !isAbsolute(item.path) ? resolve(baseDir, item.path) : item.path || null;

      upsertApp(db, {
        ...item,
        path: resolvedPath,
        // Keep the live runtime status; fall back to the config default otherwise.
        status: existing ? existing.status : item.status
      });

      synced.push(item.name);
    }
  });

  apply(entries);
  return synced;
}

export function getAppById(db, appId) {
  return db.prepare("SELECT * FROM apps WHERE id = ?").get(appId) || null;
}

export function deleteApp(db, appId) {
  const result = db.prepare("DELETE FROM apps WHERE id = ?").run(appId);
  return result.changes > 0;
}

export function updateAppStatus(db, appId, status) {
  db.prepare("UPDATE apps SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, appId);
}

export function recordRuntimeStart(db, appId, pid) {
  db.prepare(`
    INSERT INTO runtime_instances (app_id, pid, status, started_at)
    VALUES (?, ?, 'running', CURRENT_TIMESTAMP)
  `).run(appId, pid);
  updateAppStatus(db, appId, "running");
}

export function recordRuntimeStop(db, appId, pid, exitCode, status = "stopped") {
  db.prepare(`
    UPDATE runtime_instances
    SET status = ?, stopped_at = CURRENT_TIMESTAMP, exit_code = ?, updated_at = CURRENT_TIMESTAMP
    WHERE app_id = ? AND pid = ? AND stopped_at IS NULL
  `).run(status, exitCode, appId, pid);
  updateAppStatus(db, appId, status);
}

export function initializeRoutely(root) {
  const database = openRoutelyDatabase(root);
  database.db
    .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('initialized_at', COALESCE((SELECT value FROM settings WHERE key = 'initialized_at'), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)")
    .run();
  return database;
}
