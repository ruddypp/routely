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
      install TEXT,
      dev TEXT,
      build TEXT,
      start TEXT,
      env TEXT NOT NULL DEFAULT '{}',
      port INTEGER,
      depends_on TEXT NOT NULL DEFAULT '[]',
      healthcheck TEXT,
      domains TEXT NOT NULL DEFAULT '[]',
      source TEXT,
      image TEXT,
      internal INTEGER NOT NULL DEFAULT 0,
      volumes TEXT NOT NULL DEFAULT '[]',
      compose_file TEXT,
      compose_service TEXT,
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
  addColumnIfMissing(db, "apps", "depends_on", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "apps", "install", "TEXT");
  addColumnIfMissing(db, "apps", "dev", "TEXT");
  addColumnIfMissing(db, "apps", "build", "TEXT");
  addColumnIfMissing(db, "apps", "start", "TEXT");
  addColumnIfMissing(db, "apps", "env", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(db, "apps", "healthcheck", "TEXT");
  addColumnIfMissing(db, "apps", "domains", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "apps", "source", "TEXT");
  addColumnIfMissing(db, "apps", "image", "TEXT");
  addColumnIfMissing(db, "apps", "internal", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "apps", "volumes", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "apps", "compose_file", "TEXT");
  addColumnIfMissing(db, "apps", "compose_service", "TEXT");

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
  return db.prepare("SELECT * FROM apps ORDER BY name ASC").all().map(parseAppRecord);
}

export function getAppByName(db, name) {
  const row = db.prepare("SELECT * FROM apps WHERE name = ?").get(name) || null;
  return row ? parseAppRecord(row) : null;
}

export function listRunningRuntimeInstances(db) {
  return db
    .prepare(
      `SELECT runtime_instances.*, apps.name AS app_name
       FROM runtime_instances
       JOIN apps ON apps.id = runtime_instances.app_id
       WHERE runtime_instances.stopped_at IS NULL
         AND runtime_instances.status = 'running'
       ORDER BY runtime_instances.started_at ASC`
    )
    .all();
}

export function reconcileStaleRuntimeInstances(db, isPidAlive = defaultIsPidAlive) {
  const instances = listRunningRuntimeInstances(db);
  const stale = instances.filter((instance) => !instance.pid || !isPidAlive(instance.pid));

  if (stale.length === 0) {
    return [];
  }

  const stopInstance = db.prepare(`
    UPDATE runtime_instances
    SET status = 'stopped', stopped_at = CURRENT_TIMESTAMP, exit_code = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const runningForApp = db.prepare(`
    SELECT COUNT(*) AS count
    FROM runtime_instances
    WHERE app_id = ? AND stopped_at IS NULL AND status = 'running'
  `);

  const reconcile = db.transaction((items) => {
    for (const instance of items) {
      stopInstance.run(instance.id);
      const remaining = runningForApp.get(instance.app_id);
      if (!remaining || Number(remaining.count) === 0) {
        updateAppStatus(db, instance.app_id, "stopped");
      }
    }
  });

  reconcile(stale);
  return stale;
}

function defaultIsPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function parseAppRecord(row) {
  return {
    ...row,
    env: parseJsonObject(row.env),
    depends_on: parseJsonArray(row.depends_on),
    healthcheck: parseJsonObject(row.healthcheck) || null,
    domains: parseJsonArray(row.domains),
    source: parseJsonObject(row.source) || null,
    internal: Boolean(row.internal),
    volumes: parseJsonArray(row.volumes)
  };
}

function parseDependsOn(value) {
  return parseJsonArray(value);
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function serializeDependsOn(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function serializeJsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function serializeJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? JSON.stringify(value) : null;
}

export function upsertApp(db, input) {
  const app = normalizeAppInput(input);
  const existing = getAppByName(db, app.name);

  if (existing) {
    db.prepare(`
      UPDATE apps
      SET server_id = ?, type = ?, preset = ?, driver = ?, path = ?, command = ?, install = ?, dev = ?, build = ?, start = ?, env = ?, port = ?, depends_on = ?, healthcheck = ?, domains = ?, source = ?, image = ?, internal = ?, volumes = ?, compose_file = ?, compose_service = ?, enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `).run(
      app.server_id,
      app.type,
      app.preset,
      app.driver,
      app.path,
      app.command,
      app.install,
      app.dev,
      app.build,
      app.start,
      serializeJsonObject(app.env) || "{}",
      app.port,
      serializeDependsOn(app.depends_on),
      serializeJsonObject(app.healthcheck),
      serializeJsonArray(app.domains),
      serializeJsonObject(app.source),
      app.image,
      app.internal ? 1 : 0,
      serializeJsonArray(app.volumes),
      app.compose_file,
      app.compose_service,
      app.enabled ? 1 : 0,
      app.status,
      app.name
    );
  } else {
    db.prepare(`
      INSERT INTO apps (server_id, name, type, preset, driver, path, command, install, dev, build, start, env, port, depends_on, healthcheck, domains, source, image, internal, volumes, compose_file, compose_service, enabled, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.server_id,
      app.name,
      app.type,
      app.preset,
      app.driver,
      app.path,
      app.command,
      app.install,
      app.dev,
      app.build,
      app.start,
      serializeJsonObject(app.env) || "{}",
      app.port,
      serializeDependsOn(app.depends_on),
      serializeJsonObject(app.healthcheck),
      serializeJsonArray(app.domains),
      serializeJsonObject(app.source),
      app.image,
      app.internal ? 1 : 0,
      serializeJsonArray(app.volumes),
      app.compose_file,
      app.compose_service,
      app.enabled ? 1 : 0,
      app.status
    );
  }

  return getAppByName(db, app.name);
}

export function updateApp(db, appId, input) {
  const existing = getAppById(db, appId);

  if (!existing) {
    return null;
  }

  const app = normalizeAppInput({
    ...existing,
    ...input,
    server_id: input.server_id ?? existing.server_id,
    name: input.name ?? existing.name,
    status: input.status ?? existing.status
  });

  db.prepare(`
    UPDATE apps
    SET server_id = ?, name = ?, type = ?, preset = ?, driver = ?, path = ?, command = ?, install = ?, dev = ?, build = ?, start = ?, env = ?, port = ?, depends_on = ?, healthcheck = ?, domains = ?, source = ?, image = ?, internal = ?, volumes = ?, compose_file = ?, compose_service = ?, enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    app.server_id,
    app.name,
    app.type,
    app.preset,
    app.driver,
    app.path,
    app.command,
    app.install,
    app.dev,
    app.build,
    app.start,
    serializeJsonObject(app.env) || "{}",
    app.port,
    serializeDependsOn(app.depends_on),
    serializeJsonObject(app.healthcheck),
    serializeJsonArray(app.domains),
    serializeJsonObject(app.source),
    app.image,
    app.internal ? 1 : 0,
    serializeJsonArray(app.volumes),
    app.compose_file,
    app.compose_service,
    app.enabled ? 1 : 0,
    app.status,
    appId
  );

  return getAppById(db, appId);
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
  const row = db.prepare("SELECT * FROM apps WHERE id = ?").get(appId) || null;
  return row ? parseAppRecord(row) : null;
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

export function getSetting(db, key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

export function setSetting(db, key, value) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, String(value));
}

export function getServerFoundationState(db) {
  const mode = getSetting(db, "server.mode") || "local";
  const dataDir = getSetting(db, "server.data_dir");
  const initializedAt = getSetting(db, "server.initialized_at");
  const tokenHash = getSetting(db, "auth.admin_token_hash");
  const tokenSalt = getSetting(db, "auth.admin_token_salt");
  const tokenCreatedAt = getSetting(db, "auth.admin_token_created_at");
  const lastDoctorJson = getSetting(db, "server.last_doctor");

  return {
    mode,
    production: mode === "production",
    dataDir,
    initializedAt,
    auth: {
      required: mode === "production",
      configured: Boolean(tokenHash && tokenSalt),
      tokenHash,
      tokenSalt,
      tokenCreatedAt
    },
    lastDoctor: lastDoctorJson ? parseJsonObject(lastDoctorJson) : null
  };
}

export function saveServerFoundationState(db, state) {
  const apply = db.transaction((input) => {
    if (input.mode) setSetting(db, "server.mode", input.mode);
    if (input.dataDir) setSetting(db, "server.data_dir", input.dataDir);
    if (input.initializedAt) setSetting(db, "server.initialized_at", input.initializedAt);
    if (input.adminTokenHash) setSetting(db, "auth.admin_token_hash", input.adminTokenHash);
    if (input.adminTokenSalt) setSetting(db, "auth.admin_token_salt", input.adminTokenSalt);
    if (input.adminTokenCreatedAt) setSetting(db, "auth.admin_token_created_at", input.adminTokenCreatedAt);
    if (input.lastDoctor) setSetting(db, "server.last_doctor", JSON.stringify(input.lastDoctor));
  });

  apply(state);
  return getServerFoundationState(db);
}

export function initializeRoutely(root) {
  const database = openRoutelyDatabase(root);
  database.db
    .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('initialized_at', COALESCE((SELECT value FROM settings WHERE key = 'initialized_at'), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)")
    .run();
  return database;
}
