import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { normalizeAppEnvInput, normalizeAppInput, normalizeBackupSchedule, normalizeDatabaseType, normalizeNotificationChannelInput } from "@routely/core";

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
      ports TEXT NOT NULL DEFAULT '[]',
      depends_on TEXT NOT NULL DEFAULT '[]',
      healthcheck TEXT,
      domains TEXT NOT NULL DEFAULT '[]',
      source TEXT,
      image TEXT,
      internal INTEGER NOT NULL DEFAULT 0,
      volumes TEXT NOT NULL DEFAULT '[]',
      compose_file TEXT,
      compose_service TEXT,
      needs_restart INTEGER NOT NULL DEFAULT 0,
      needs_redeploy INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'stopped',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_env_vars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      is_secret INTEGER NOT NULL DEFAULT 0,
      scope TEXT NOT NULL DEFAULT 'all',
      needs_restart INTEGER NOT NULL DEFAULT 1,
      needs_redeploy INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(app_id, key)
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

    CREATE TABLE IF NOT EXISTS app_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'local',
      repo TEXT,
      branch TEXT,
      path TEXT,
      dockerfile_path TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(app_id, source_type)
    );

    CREATE TABLE IF NOT EXISTS healthchecks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      deployment_id INTEGER REFERENCES deployments(id) ON DELETE SET NULL,
      target TEXT NOT NULL DEFAULT 'runtime',
      path TEXT,
      expected_status INTEGER NOT NULL DEFAULT 200,
      last_status TEXT,
      last_http_status INTEGER,
      last_response_time_ms INTEGER,
      last_message TEXT,
      last_checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(app_id, target)
    );

    CREATE TABLE IF NOT EXISTS metrics_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
      deployment_id INTEGER REFERENCES deployments(id) ON DELETE SET NULL,
      scope TEXT NOT NULL DEFAULT 'host',
      cpu_percent REAL,
      memory_bytes INTEGER,
      memory_limit_bytes INTEGER,
      disk_used_bytes INTEGER,
      disk_total_bytes INTEGER,
      network_rx_bytes INTEGER,
      network_tx_bytes INTEGER,
      message TEXT,
      sampled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS databases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER REFERENCES apps(id) ON DELETE SET NULL,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'stopped',
      internal INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      port INTEGER,
      compose_service TEXT,
      compose_file TEXT,
      volume_name TEXT,
      env TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backup_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      database_id INTEGER NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
      enabled INTEGER NOT NULL DEFAULT 1,
      schedule TEXT,
      retention_days INTEGER NOT NULL DEFAULT 7,
      local_dir TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(database_id)
    );

    CREATE TABLE IF NOT EXISTS backup_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_job_id INTEGER NOT NULL REFERENCES backup_jobs(id) ON DELETE CASCADE,
      database_id INTEGER NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'queued',
      trigger TEXT NOT NULL DEFAULT 'manual',
      file_path TEXT,
      size_bytes INTEGER,
      message TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      events TEXT NOT NULL DEFAULT '[]',
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER REFERENCES notification_channels(id) ON DELETE SET NULL,
      event TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      http_status INTEGER,
      message TEXT,
      target TEXT,
      resource_type TEXT,
      resource_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'local',
      repo TEXT,
      branch TEXT,
      commit_sha TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      phase TEXT NOT NULL DEFAULT 'queued',
      image_tag TEXT,
      container_name TEXT,
      previous_image_tag TEXT,
      previous_container_name TEXT,
      host_port INTEGER,
      container_port INTEGER,
      error_message TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deployment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deployment_id INTEGER NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      phase TEXT NOT NULL,
      stream TEXT NOT NULL DEFAULT 'system',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      hostname TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      dns_status TEXT NOT NULL DEFAULT 'pending',
      tls_status TEXT NOT NULL DEFAULT 'pending',
      target_port INTEGER,
      verification_message TEXT,
      last_verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proxy_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      deployment_id INTEGER REFERENCES deployments(id) ON DELETE SET NULL,
      router_name TEXT NOT NULL,
      service_name TEXT NOT NULL,
      target_url TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(domain_id)
    );

    CREATE TABLE IF NOT EXISTS github_installations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installation_id INTEGER NOT NULL UNIQUE,
      account_login TEXT NOT NULL,
      account_type TEXT,
      app_id TEXT,
      target_type TEXT,
      permissions TEXT NOT NULL DEFAULT '{}',
      events TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS github_repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installation_id INTEGER REFERENCES github_installations(installation_id) ON DELETE SET NULL,
      github_repository_id INTEGER UNIQUE,
      full_name TEXT NOT NULL UNIQUE,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      private INTEGER NOT NULL DEFAULT 0,
      default_branch TEXT,
      html_url TEXT,
      connected_app_id INTEGER REFERENCES apps(id) ON DELETE SET NULL,
      selected_branch TEXT,
      auto_deploy_enabled INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS github_webhook_deliveries (
      delivery_id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      action TEXT,
      status TEXT NOT NULL DEFAULT 'received',
      signature_valid INTEGER NOT NULL DEFAULT 0,
      app_id INTEGER REFERENCES apps(id) ON DELETE SET NULL,
      deployment_id INTEGER REFERENCES deployments(id) ON DELETE SET NULL,
      repo TEXT,
      branch TEXT,
      commit_sha TEXT,
      message TEXT,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing(db, "apps", "server_id", "INTEGER");
  addColumnIfMissing(db, "apps", "ports", "TEXT NOT NULL DEFAULT '[]'");
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
  addColumnIfMissing(db, "apps", "needs_restart", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "apps", "needs_redeploy", "INTEGER NOT NULL DEFAULT 0");

  addColumnIfMissing(db, "app_env_vars", "scope", "TEXT NOT NULL DEFAULT 'all'");
  addColumnIfMissing(db, "app_env_vars", "needs_restart", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "app_env_vars", "needs_redeploy", "INTEGER NOT NULL DEFAULT 1");

  addColumnIfMissing(db, "deployments", "phase", "TEXT NOT NULL DEFAULT 'queued'");
  addColumnIfMissing(db, "deployments", "image_tag", "TEXT");
  addColumnIfMissing(db, "deployments", "container_name", "TEXT");
  addColumnIfMissing(db, "deployments", "previous_image_tag", "TEXT");
  addColumnIfMissing(db, "deployments", "previous_container_name", "TEXT");
  addColumnIfMissing(db, "deployments", "host_port", "INTEGER");
  addColumnIfMissing(db, "deployments", "container_port", "INTEGER");

  addColumnIfMissing(db, "domains", "target_port", "INTEGER");
  addColumnIfMissing(db, "domains", "verification_message", "TEXT");
  addColumnIfMissing(db, "domains", "last_verified_at", "TEXT");
  addColumnIfMissing(db, "proxy_routes", "deployment_id", "INTEGER REFERENCES deployments(id) ON DELETE SET NULL");

  addColumnIfMissing(db, "github_repositories", "connected_app_id", "INTEGER REFERENCES apps(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "github_repositories", "selected_branch", "TEXT");
  addColumnIfMissing(db, "github_repositories", "auto_deploy_enabled", "INTEGER NOT NULL DEFAULT 0");

  addColumnIfMissing(db, "github_webhook_deliveries", "app_id", "INTEGER REFERENCES apps(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "github_webhook_deliveries", "deployment_id", "INTEGER REFERENCES deployments(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "github_webhook_deliveries", "message", "TEXT");

  addColumnIfMissing(db, "healthchecks", "deployment_id", "INTEGER REFERENCES deployments(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "healthchecks", "target", "TEXT NOT NULL DEFAULT 'runtime'");
  addColumnIfMissing(db, "healthchecks", "last_http_status", "INTEGER");
  addColumnIfMissing(db, "healthchecks", "last_response_time_ms", "INTEGER");
  addColumnIfMissing(db, "healthchecks", "last_message", "TEXT");
  addColumnIfMissing(db, "databases", "app_id", "INTEGER REFERENCES apps(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "databases", "status", "TEXT NOT NULL DEFAULT 'stopped'");
  addColumnIfMissing(db, "databases", "internal", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "databases", "image", "TEXT");
  addColumnIfMissing(db, "databases", "port", "INTEGER");
  addColumnIfMissing(db, "databases", "compose_service", "TEXT");
  addColumnIfMissing(db, "databases", "compose_file", "TEXT");
  addColumnIfMissing(db, "databases", "volume_name", "TEXT");
  addColumnIfMissing(db, "databases", "env", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(db, "backup_jobs", "local_dir", "TEXT");
  addColumnIfMissing(db, "backup_runs", "trigger", "TEXT NOT NULL DEFAULT 'manual'");
  addColumnIfMissing(db, "notification_delivery_attempts", "target", "TEXT");
  addColumnIfMissing(db, "notification_delivery_attempts", "resource_type", "TEXT");
  addColumnIfMissing(db, "notification_delivery_attempts", "resource_id", "INTEGER");
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_healthchecks_app_target ON healthchecks(app_id, target)");
  } catch {
    // Existing pre-index duplicate rows are harmless for the MVP queries.
  }

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
  const env = parseJsonObject(row.env);
  const ports = parseJsonNumberArray(row.ports);
  return {
    ...row,
    env,
    envKeys: Object.keys(env).sort(),
    ports: ports.length > 0 ? ports : row.port ? [Number(row.port)] : [],
    depends_on: parseJsonArray(row.depends_on),
    healthcheck: row.healthcheck ? parseJsonObject(row.healthcheck) : null,
    domains: parseJsonArray(row.domains),
    source: row.source ? parseJsonObject(row.source) : null,
    internal: Boolean(row.internal),
    volumes: parseJsonArray(row.volumes),
    needs_restart: Boolean(row.needs_restart),
    needs_redeploy: Boolean(row.needs_redeploy),
    enabled: Boolean(row.enabled)
  };
}

function parseAppEnvVarRecord(row) {
  return {
    ...row,
    is_secret: Boolean(row.is_secret),
    needs_restart: Boolean(row.needs_restart),
    needs_redeploy: Boolean(row.needs_redeploy)
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

function parseJsonNumberArray(value) {
  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => Number.isInteger(item) && item > 0);
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number).filter((item) => Number.isInteger(item) && item > 0) : [];
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
      SET server_id = ?, type = ?, preset = ?, driver = ?, path = ?, command = ?, install = ?, dev = ?, build = ?, start = ?, env = ?, port = ?, ports = ?, depends_on = ?, healthcheck = ?, domains = ?, source = ?, image = ?, internal = ?, volumes = ?, compose_file = ?, compose_service = ?, enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
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
      serializeJsonArray(app.ports),
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
      INSERT INTO apps (server_id, name, type, preset, driver, path, command, install, dev, build, start, env, port, ports, depends_on, healthcheck, domains, source, image, internal, volumes, compose_file, compose_service, enabled, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      serializeJsonArray(app.ports),
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
  const settingsChanged = appSettingsChanged(existing, app);

  db.prepare(`
    UPDATE apps
    SET server_id = ?, name = ?, type = ?, preset = ?, driver = ?, path = ?, command = ?, install = ?, dev = ?, build = ?, start = ?, env = ?, port = ?, ports = ?, depends_on = ?, healthcheck = ?, domains = ?, source = ?, image = ?, internal = ?, volumes = ?, compose_file = ?, compose_service = ?, needs_restart = ?, needs_redeploy = ?, enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
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
    serializeJsonArray(app.ports),
    serializeDependsOn(app.depends_on),
    serializeJsonObject(app.healthcheck),
    serializeJsonArray(app.domains),
    serializeJsonObject(app.source),
    app.image,
    app.internal ? 1 : 0,
    serializeJsonArray(app.volumes),
    app.compose_file,
    app.compose_service,
    settingsChanged ? 1 : existing.needs_restart ? 1 : 0,
    settingsChanged ? 1 : existing.needs_redeploy ? 1 : 0,
    app.enabled ? 1 : 0,
    app.status,
    appId
  );

  return getAppById(db, appId);
}

function appSettingsChanged(existing, next) {
  const keys = [
    "type",
    "preset",
    "driver",
    "path",
    "command",
    "install",
    "dev",
    "build",
    "start",
    "env",
    "port",
    "ports",
    "healthcheck",
    "domains",
    "source",
    "image",
    "internal",
    "volumes",
    "compose_file",
    "compose_service",
    "enabled"
  ];
  return keys.some((key) => JSON.stringify(existing[key] ?? null) !== JSON.stringify(next[key] ?? null));
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

export function listAppEnvVars(db, appId) {
  return db.prepare("SELECT * FROM app_env_vars WHERE app_id = ? ORDER BY key ASC").all(appId).map(parseAppEnvVarRecord);
}

export function getAppEnvVar(db, appId, key) {
  const row = db.prepare("SELECT * FROM app_env_vars WHERE app_id = ? AND key = ?").get(appId, String(key || "").trim()) || null;
  return row ? parseAppEnvVarRecord(row) : null;
}

export function upsertAppEnvVar(db, appId, input) {
  const app = getAppById(db, appId);
  if (!app) return null;
  const env = normalizeAppEnvInput(input);

  db.prepare(`
    INSERT INTO app_env_vars (app_id, key, value, is_secret, scope, needs_restart, needs_redeploy)
    VALUES (?, ?, ?, ?, ?, 1, 1)
    ON CONFLICT(app_id, key) DO UPDATE SET
      value = excluded.value,
      is_secret = excluded.is_secret,
      scope = excluded.scope,
      needs_restart = 1,
      needs_redeploy = 1,
      updated_at = CURRENT_TIMESTAMP
  `).run(app.id, env.key, env.value, env.isSecret ? 1 : 0, env.scope);

  db.prepare("UPDATE apps SET needs_restart = 1, needs_redeploy = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(app.id);

  return getAppEnvVar(db, app.id, env.key);
}

export function deleteAppEnvVar(db, appId, key) {
  const result = db.prepare("DELETE FROM app_env_vars WHERE app_id = ? AND key = ?").run(appId, String(key || "").trim());
  if (result.changes > 0) {
    db.prepare("UPDATE apps SET needs_restart = 1, needs_redeploy = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(appId);
  }
  return result.changes > 0;
}

export function clearAppEnvPendingFlags(db, appId, flags = {}) {
  const clearRestart = flags.restart === true;
  const clearRedeploy = flags.redeploy === true;
  if (!clearRestart && !clearRedeploy) return listAppEnvVars(db, appId);

  db.prepare(`
    UPDATE app_env_vars
    SET needs_restart = CASE WHEN ? THEN 0 ELSE needs_restart END,
        needs_redeploy = CASE WHEN ? THEN 0 ELSE needs_redeploy END,
        updated_at = CURRENT_TIMESTAMP
    WHERE app_id = ?
  `).run(clearRestart ? 1 : 0, clearRedeploy ? 1 : 0, appId);

  db.prepare(`
    UPDATE apps
    SET needs_restart = CASE WHEN ? THEN 0 ELSE needs_restart END,
        needs_redeploy = CASE WHEN ? THEN 0 ELSE needs_redeploy END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(clearRestart ? 1 : 0, clearRedeploy ? 1 : 0, appId);

  return listAppEnvVars(db, appId);
}

export function appEnvPendingState(db, appId) {
  const app = getAppById(db, appId);
  const row = db.prepare(`
    SELECT
      COALESCE(MAX(needs_restart), 0) AS needs_restart,
      COALESCE(MAX(needs_redeploy), 0) AS needs_redeploy,
      COUNT(*) AS count
    FROM app_env_vars
    WHERE app_id = ?
  `).get(appId);
  return {
    count: Number(row?.count || 0),
    needsRestart: Boolean(app?.needs_restart || row?.needs_restart),
    needsRedeploy: Boolean(app?.needs_redeploy || row?.needs_redeploy)
  };
}

export function listSecretValuesForApp(db, appId) {
  return db.prepare("SELECT value FROM app_env_vars WHERE app_id = ? AND is_secret = 1").all(appId).map((row) => String(row.value || "")).filter(Boolean);
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
  const remaining = db.prepare(`
    SELECT COUNT(*) AS count
    FROM runtime_instances
    WHERE app_id = ? AND stopped_at IS NULL AND status = 'running'
  `).get(appId);
  updateAppStatus(db, appId, Number(remaining?.count || 0) > 0 ? "running" : status);
}

export function createDeployment(db, input) {
  const source = input.source || {};
  const previous = input.previous || {};
  const result = db.prepare(`
    INSERT INTO deployments (app_id, source_type, repo, branch, commit_sha, status, phase, previous_image_tag, previous_container_name, container_port, host_port, started_at)
    VALUES (?, ?, ?, ?, ?, 'queued', 'queued', ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    input.appId,
    source.type || "local",
    source.repo || null,
    source.branch || null,
    source.commitSha || null,
    previous.imageTag || null,
    previous.containerName || null,
    input.containerPort || null,
    input.hostPort || null
  );

  return getDeploymentById(db, Number(result.lastInsertRowid));
}

export function getDeploymentById(db, deploymentId) {
  const row = db.prepare(`
    SELECT deployments.*, apps.name AS app_name
    FROM deployments
    JOIN apps ON apps.id = deployments.app_id
    WHERE deployments.id = ?
  `).get(deploymentId) || null;
  return row ? parseDeploymentRecord(row) : null;
}

export function listDeployments(db, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 50;
  return db.prepare(`
    SELECT deployments.*, apps.name AS app_name
    FROM deployments
    JOIN apps ON apps.id = deployments.app_id
    ORDER BY deployments.created_at DESC, deployments.id DESC
    LIMIT ?
  `).all(limit).map(parseDeploymentRecord);
}

export function listDeploymentsForApp(db, appId, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 20;
  return db.prepare(`
    SELECT deployments.*, apps.name AS app_name
    FROM deployments
    JOIN apps ON apps.id = deployments.app_id
    WHERE deployments.app_id = ?
    ORDER BY deployments.created_at DESC, deployments.id DESC
    LIMIT ?
  `).all(appId, limit).map(parseDeploymentRecord);
}

export function getLatestSuccessfulDeploymentForApp(db, appId) {
  const row = db.prepare(`
    SELECT deployments.*, apps.name AS app_name
    FROM deployments
    JOIN apps ON apps.id = deployments.app_id
    WHERE deployments.app_id = ? AND deployments.status = 'succeeded'
    ORDER BY deployments.finished_at DESC, deployments.id DESC
    LIMIT 1
  `).get(appId) || null;
  return row ? parseDeploymentRecord(row) : null;
}

export function getActiveDeploymentForApp(db, appId) {
  const row = db.prepare(`
    SELECT deployments.*, apps.name AS app_name
    FROM deployments
    JOIN apps ON apps.id = deployments.app_id
    WHERE deployments.app_id = ?
      AND deployments.status IN ('queued', 'preparing', 'building', 'starting', 'healthchecking')
    ORDER BY deployments.created_at ASC, deployments.id ASC
    LIMIT 1
  `).get(appId) || null;
  return row ? parseDeploymentRecord(row) : null;
}

export function updateDeployment(db, deploymentId, patch) {
  const existing = getDeploymentById(db, deploymentId);
  if (!existing) return null;

  const next = {
    status: patch.status ?? existing.status,
    phase: patch.phase ?? patch.status ?? existing.phase,
    imageTag: patch.imageTag ?? existing.image_tag,
    containerName: patch.containerName ?? existing.container_name,
    hostPort: patch.hostPort ?? existing.host_port,
    containerPort: patch.containerPort ?? existing.container_port,
    errorMessage: patch.errorMessage === undefined ? existing.error_message : patch.errorMessage,
    finishedAt: patch.finishedAt === undefined ? existing.finished_at : patch.finishedAt
  };

  db.prepare(`
    UPDATE deployments
    SET status = ?, phase = ?, image_tag = ?, container_name = ?, host_port = ?, container_port = ?, error_message = ?, finished_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    next.status,
    next.phase,
    next.imageTag,
    next.containerName,
    next.hostPort,
    next.containerPort,
    next.errorMessage,
    next.finishedAt,
    deploymentId
  );

  return getDeploymentById(db, deploymentId);
}

export function appendDeploymentLog(db, deploymentId, input) {
  const sequenceRow = db.prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM deployment_logs WHERE deployment_id = ?").get(deploymentId);
  const sequence = Number(sequenceRow?.sequence || 1);
  const result = db.prepare(`
    INSERT INTO deployment_logs (deployment_id, sequence, phase, stream, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(deploymentId, sequence, input.phase || "system", input.stream || "system", String(input.message || ""));

  return db.prepare("SELECT * FROM deployment_logs WHERE id = ?").get(Number(result.lastInsertRowid));
}

export function listDeploymentLogs(db, deploymentId, options = {}) {
  const afterSequence = Number.isInteger(options.afterSequence) ? options.afterSequence : 0;
  const limit = Number.isInteger(options.limit) ? options.limit : 500;
  return db.prepare(`
    SELECT * FROM deployment_logs
    WHERE deployment_id = ? AND sequence > ?
    ORDER BY sequence ASC
    LIMIT ?
  `).all(deploymentId, afterSequence, limit);
}

export function upsertHealthcheckResult(db, input) {
  const appId = Number(input.appId || input.app_id);
  if (!Number.isInteger(appId)) {
    throw new Error("Healthcheck appId is required.");
  }
  const target = String(input.target || "runtime");

  db.prepare(`
    INSERT INTO healthchecks (app_id, deployment_id, target, path, expected_status, last_status, last_http_status, last_response_time_ms, last_message, last_checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(app_id, target) DO UPDATE SET
      deployment_id = excluded.deployment_id,
      path = excluded.path,
      expected_status = excluded.expected_status,
      last_status = excluded.last_status,
      last_http_status = excluded.last_http_status,
      last_response_time_ms = excluded.last_response_time_ms,
      last_message = excluded.last_message,
      last_checked_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    appId,
    input.deploymentId || input.deployment_id || null,
    target,
    input.path || null,
    input.expectedStatus || input.expected_status || 200,
    input.status || "unknown",
    input.httpStatus == null ? null : Number(input.httpStatus),
    input.responseTimeMs == null ? null : Number(input.responseTimeMs),
    input.message || null
  );

  return getHealthcheckForApp(db, appId, target);
}

export function getHealthcheckForApp(db, appId, target = "runtime") {
  const row = db.prepare("SELECT * FROM healthchecks WHERE app_id = ? AND target = ?").get(appId, target) || null;
  return row ? parseHealthcheckRecord(row) : null;
}

export function listHealthchecksForApp(db, appId) {
  return db.prepare("SELECT * FROM healthchecks WHERE app_id = ? ORDER BY updated_at DESC, id DESC").all(appId).map(parseHealthcheckRecord);
}

export function recordMetricSample(db, input = {}) {
  const result = db.prepare(`
    INSERT INTO metrics_samples (app_id, deployment_id, scope, cpu_percent, memory_bytes, memory_limit_bytes, disk_used_bytes, disk_total_bytes, network_rx_bytes, network_tx_bytes, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.appId || input.app_id || null,
    input.deploymentId || input.deployment_id || null,
    input.scope || "host",
    input.cpuPercent == null ? null : Number(input.cpuPercent),
    input.memoryBytes == null ? null : Number(input.memoryBytes),
    input.memoryLimitBytes == null ? null : Number(input.memoryLimitBytes),
    input.diskUsedBytes == null ? null : Number(input.diskUsedBytes),
    input.diskTotalBytes == null ? null : Number(input.diskTotalBytes),
    input.networkRxBytes == null ? null : Number(input.networkRxBytes),
    input.networkTxBytes == null ? null : Number(input.networkTxBytes),
    input.message || null
  );

  return db.prepare("SELECT * FROM metrics_samples WHERE id = ?").get(Number(result.lastInsertRowid));
}

export function listMetricSamplesForApp(db, appId, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 30;
  return db.prepare(`
    SELECT * FROM metrics_samples
    WHERE app_id = ? OR (app_id IS NULL AND scope = 'host')
    ORDER BY sampled_at DESC, id DESC
    LIMIT ?
  `).all(appId, limit).map(parseMetricSampleRecord);
}

export function listHostMetricSamples(db, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 30;
  return db.prepare(`
    SELECT * FROM metrics_samples
    WHERE app_id IS NULL AND scope = 'host'
    ORDER BY sampled_at DESC, id DESC
    LIMIT ?
  `).all(limit).map(parseMetricSampleRecord);
}

function parseHealthcheckRecord(row) {
  return {
    ...row,
    deployment_id: row.deployment_id == null ? null : Number(row.deployment_id),
    expected_status: row.expected_status == null ? null : Number(row.expected_status),
    last_http_status: row.last_http_status == null ? null : Number(row.last_http_status),
    last_response_time_ms: row.last_response_time_ms == null ? null : Number(row.last_response_time_ms)
  };
}

function parseMetricSampleRecord(row) {
  return {
    ...row,
    app_id: row.app_id == null ? null : Number(row.app_id),
    deployment_id: row.deployment_id == null ? null : Number(row.deployment_id),
    cpu_percent: row.cpu_percent == null ? null : Number(row.cpu_percent),
    memory_bytes: row.memory_bytes == null ? null : Number(row.memory_bytes),
    memory_limit_bytes: row.memory_limit_bytes == null ? null : Number(row.memory_limit_bytes),
    disk_used_bytes: row.disk_used_bytes == null ? null : Number(row.disk_used_bytes),
    disk_total_bytes: row.disk_total_bytes == null ? null : Number(row.disk_total_bytes),
    network_rx_bytes: row.network_rx_bytes == null ? null : Number(row.network_rx_bytes),
    network_tx_bytes: row.network_tx_bytes == null ? null : Number(row.network_tx_bytes)
  };
}

function parseDatabaseRecord(row) {
  return {
    ...row,
    app_id: row.app_id == null ? null : Number(row.app_id),
    internal: Boolean(row.internal),
    port: row.port == null ? null : Number(row.port),
    env: parseJsonObject(row.env)
  };
}

function parseBackupJobRecord(row) {
  return {
    ...row,
    database_id: Number(row.database_id),
    enabled: Boolean(row.enabled),
    retention_days: Number(row.retention_days || 7)
  };
}

function parseBackupRunRecord(row) {
  return {
    ...row,
    backup_job_id: Number(row.backup_job_id),
    database_id: Number(row.database_id),
    size_bytes: row.size_bytes == null ? null : Number(row.size_bytes)
  };
}

function parseNotificationChannelRecord(row) {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    events: parseJsonArray(row.events),
    config: parseJsonObject(row.config)
  };
}

function parseNotificationAttemptRecord(row) {
  return {
    ...row,
    channel_id: row.channel_id == null ? null : Number(row.channel_id),
    http_status: row.http_status == null ? null : Number(row.http_status),
    resource_id: row.resource_id == null ? null : Number(row.resource_id)
  };
}

export function listDatabases(db) {
  return db.prepare(`
    SELECT databases.*, apps.name AS app_name
    FROM databases
    LEFT JOIN apps ON apps.id = databases.app_id
    ORDER BY databases.name ASC
  `).all().map(parseDatabaseRecord);
}

export function getDatabaseById(db, databaseId) {
  const row = db.prepare(`
    SELECT databases.*, apps.name AS app_name
    FROM databases
    LEFT JOIN apps ON apps.id = databases.app_id
    WHERE databases.id = ?
  `).get(databaseId) || null;
  return row ? parseDatabaseRecord(row) : null;
}

export function getDatabaseByName(db, name) {
  const row = db.prepare(`
    SELECT databases.*, apps.name AS app_name
    FROM databases
    LEFT JOIN apps ON apps.id = databases.app_id
    WHERE databases.name = ?
  `).get(String(name || "").trim()) || null;
  return row ? parseDatabaseRecord(row) : null;
}

export function upsertDatabase(db, input = {}) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Database name is required.");
  const type = normalizeDatabaseType(input.type || input.preset);
  const existing = getDatabaseByName(db, name);
  const payload = {
    appId: input.appId ?? input.app_id ?? existing?.app_id ?? null,
    status: input.status || existing?.status || "stopped",
    internal: input.internal == null ? true : Boolean(input.internal),
    image: input.image || existing?.image || null,
    port: input.port == null || input.port === "" ? null : Number(input.port),
    composeService: input.composeService || input.compose_service || existing?.compose_service || name,
    composeFile: input.composeFile || input.compose_file || existing?.compose_file || null,
    volumeName: input.volumeName || input.volume_name || existing?.volume_name || `${name}_data`,
    env: input.env && typeof input.env === "object" && !Array.isArray(input.env) ? input.env : existing?.env || {}
  };

  if (existing) {
    db.prepare(`
      UPDATE databases
      SET app_id = ?, type = ?, status = ?, internal = ?, image = ?, port = ?, compose_service = ?, compose_file = ?, volume_name = ?, env = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      payload.appId,
      type,
      payload.status,
      payload.internal ? 1 : 0,
      payload.image,
      payload.port,
      payload.composeService,
      payload.composeFile,
      payload.volumeName,
      serializeJsonObject(payload.env) || "{}",
      existing.id
    );
    return getDatabaseById(db, existing.id);
  }

  const result = db.prepare(`
    INSERT INTO databases (app_id, name, type, status, internal, image, port, compose_service, compose_file, volume_name, env)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.appId,
    name,
    type,
    payload.status,
    payload.internal ? 1 : 0,
    payload.image,
    payload.port,
    payload.composeService,
    payload.composeFile,
    payload.volumeName,
    serializeJsonObject(payload.env) || "{}"
  );
  return getDatabaseById(db, Number(result.lastInsertRowid));
}

export function updateDatabaseStatus(db, databaseId, status) {
  db.prepare("UPDATE databases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(String(status || "unknown"), databaseId);
  return getDatabaseById(db, databaseId);
}

export function upsertBackupJob(db, input = {}) {
  const databaseId = Number(input.databaseId || input.database_id);
  if (!Number.isInteger(databaseId)) throw new Error("Backup databaseId is required.");
  if (!getDatabaseById(db, databaseId)) throw new Error(`Database ${databaseId} not found.`);
  const schedule = normalizeBackupSchedule(input.schedule);
  const retentionDays = Math.max(1, Number(input.retentionDays || input.retention_days || 7));
  const enabled = input.enabled == null ? true : Boolean(input.enabled);
  const localDir = input.localDir || input.local_dir || null;

  db.prepare(`
    INSERT INTO backup_jobs (database_id, enabled, schedule, retention_days, local_dir)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(database_id) DO UPDATE SET
      enabled = excluded.enabled,
      schedule = excluded.schedule,
      retention_days = excluded.retention_days,
      local_dir = excluded.local_dir,
      updated_at = CURRENT_TIMESTAMP
  `).run(databaseId, enabled ? 1 : 0, schedule, retentionDays, localDir);
  return getBackupJobForDatabase(db, databaseId);
}

export function getBackupJobById(db, backupJobId) {
  const row = db.prepare(`
    SELECT backup_jobs.*, databases.name AS database_name, databases.type AS database_type,
      latest.status AS last_run_status, latest.finished_at AS last_run_at, latest.message AS last_run_message
    FROM backup_jobs
    JOIN databases ON databases.id = backup_jobs.database_id
    LEFT JOIN backup_runs latest ON latest.id = (
      SELECT id FROM backup_runs WHERE backup_job_id = backup_jobs.id ORDER BY created_at DESC, id DESC LIMIT 1
    )
    WHERE backup_jobs.id = ?
  `).get(backupJobId) || null;
  return row ? parseBackupJobRecord(row) : null;
}

export function getBackupJobForDatabase(db, databaseId) {
  const row = db.prepare(`
    SELECT backup_jobs.*, databases.name AS database_name, databases.type AS database_type,
      latest.status AS last_run_status, latest.finished_at AS last_run_at, latest.message AS last_run_message
    FROM backup_jobs
    JOIN databases ON databases.id = backup_jobs.database_id
    LEFT JOIN backup_runs latest ON latest.id = (
      SELECT id FROM backup_runs WHERE backup_job_id = backup_jobs.id ORDER BY created_at DESC, id DESC LIMIT 1
    )
    WHERE backup_jobs.database_id = ?
  `).get(databaseId) || null;
  return row ? parseBackupJobRecord(row) : null;
}

export function listBackupJobs(db) {
  return db.prepare(`
    SELECT backup_jobs.*, databases.name AS database_name, databases.type AS database_type,
      latest.status AS last_run_status, latest.finished_at AS last_run_at, latest.message AS last_run_message
    FROM backup_jobs
    JOIN databases ON databases.id = backup_jobs.database_id
    LEFT JOIN backup_runs latest ON latest.id = (
      SELECT id FROM backup_runs WHERE backup_job_id = backup_jobs.id ORDER BY created_at DESC, id DESC LIMIT 1
    )
    ORDER BY databases.name ASC
  `).all().map(parseBackupJobRecord);
}

export function listDueBackupJobs(db, isDue) {
  return listBackupJobs(db).filter((job) => job.enabled && job.schedule && isDue(job.schedule, job.last_run_at));
}

export function createBackupRun(db, input = {}) {
  const backupJobId = Number(input.backupJobId || input.backup_job_id);
  const job = getBackupJobById(db, backupJobId);
  if (!job) throw new Error(`Backup job ${backupJobId} not found.`);
  const result = db.prepare(`
    INSERT INTO backup_runs (backup_job_id, database_id, status, trigger, started_at, message)
    VALUES (?, ?, 'queued', ?, CURRENT_TIMESTAMP, ?)
  `).run(job.id, job.database_id, input.trigger || "manual", input.message || null);
  return getBackupRunById(db, Number(result.lastInsertRowid));
}

export function updateBackupRun(db, backupRunId, patch = {}) {
  const existing = getBackupRunById(db, backupRunId);
  if (!existing) return null;
  db.prepare(`
    UPDATE backup_runs
    SET status = ?, file_path = ?, size_bytes = ?, message = ?, finished_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    patch.status || existing.status,
    patch.filePath === undefined && patch.file_path === undefined ? existing.file_path : patch.filePath ?? patch.file_path,
    patch.sizeBytes === undefined && patch.size_bytes === undefined ? existing.size_bytes : patch.sizeBytes ?? patch.size_bytes,
    patch.message === undefined ? existing.message : patch.message,
    patch.finishedAt === undefined && patch.finished_at === undefined ? existing.finished_at : patch.finishedAt ?? patch.finished_at,
    backupRunId
  );
  return getBackupRunById(db, backupRunId);
}

export function getBackupRunById(db, backupRunId) {
  const row = db.prepare(`
    SELECT backup_runs.*, databases.name AS database_name, databases.type AS database_type
    FROM backup_runs
    JOIN databases ON databases.id = backup_runs.database_id
    WHERE backup_runs.id = ?
  `).get(backupRunId) || null;
  return row ? parseBackupRunRecord(row) : null;
}

export function listBackupRuns(db, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 50;
  return db.prepare(`
    SELECT backup_runs.*, databases.name AS database_name, databases.type AS database_type
    FROM backup_runs
    JOIN databases ON databases.id = backup_runs.database_id
    ORDER BY backup_runs.created_at DESC, backup_runs.id DESC
    LIMIT ?
  `).all(limit).map(parseBackupRunRecord);
}

export function listBackupRunsForJob(db, backupJobId, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 50;
  return db.prepare(`
    SELECT backup_runs.*, databases.name AS database_name, databases.type AS database_type
    FROM backup_runs
    JOIN databases ON databases.id = backup_runs.database_id
    WHERE backup_runs.backup_job_id = ?
    ORDER BY backup_runs.created_at DESC, backup_runs.id DESC
    LIMIT ?
  `).all(backupJobId, limit).map(parseBackupRunRecord);
}

export function markBackupRunsPruned(db, runIds = []) {
  const ids = (runIds || []).map(Number).filter(Number.isInteger);
  if (ids.length === 0) return [];
  const mark = db.prepare("UPDATE backup_runs SET status = 'pruned', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const apply = db.transaction((items) => items.forEach((id) => mark.run(id)));
  apply(ids);
  return ids.map((id) => getBackupRunById(db, id)).filter(Boolean);
}

export function listNotificationChannels(db) {
  return db.prepare("SELECT * FROM notification_channels ORDER BY enabled DESC, name ASC").all().map(parseNotificationChannelRecord);
}

export function listEnabledNotificationChannelsForEvent(db, event) {
  return listNotificationChannels(db).filter((channel) => channel.enabled && channel.events.includes(String(event)));
}

export function getNotificationChannelById(db, channelId) {
  const row = db.prepare("SELECT * FROM notification_channels WHERE id = ?").get(Number(channelId)) || null;
  return row ? parseNotificationChannelRecord(row) : null;
}

export function upsertNotificationChannel(db, input = {}) {
  const channel = normalizeNotificationChannelInput(input);
  const id = Number(input.id || input.channelId || input.channel_id);
  const existing = Number.isInteger(id) ? getNotificationChannelById(db, id) : db.prepare("SELECT * FROM notification_channels WHERE name = ?").get(channel.name);

  if (existing) {
    db.prepare(`
      UPDATE notification_channels
      SET name = ?, type = ?, enabled = ?, events = ?, config = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(channel.name, channel.type, channel.enabled ? 1 : 0, serializeJsonArray(channel.events), serializeJsonObject(channel.config) || "{}", existing.id);
    return getNotificationChannelById(db, existing.id);
  }

  const result = db.prepare(`
    INSERT INTO notification_channels (name, type, enabled, events, config)
    VALUES (?, ?, ?, ?, ?)
  `).run(channel.name, channel.type, channel.enabled ? 1 : 0, serializeJsonArray(channel.events), serializeJsonObject(channel.config) || "{}");
  return getNotificationChannelById(db, Number(result.lastInsertRowid));
}

export function deleteNotificationChannel(db, channelId) {
  const result = db.prepare("DELETE FROM notification_channels WHERE id = ?").run(Number(channelId));
  return result.changes > 0;
}

export function createNotificationAttempt(db, input = {}) {
  const result = db.prepare(`
    INSERT INTO notification_delivery_attempts (channel_id, event, status, target, resource_type, resource_id, message)
    VALUES (?, ?, 'queued', ?, ?, ?, ?)
  `).run(
    input.channelId || input.channel_id || null,
    String(input.event || "unknown"),
    input.target || null,
    input.resourceType || input.resource_type || null,
    input.resourceId || input.resource_id || null,
    input.message || null
  );
  return getNotificationAttemptById(db, Number(result.lastInsertRowid));
}

export function updateNotificationAttempt(db, attemptId, patch = {}) {
  const existing = getNotificationAttemptById(db, attemptId);
  if (!existing) return null;
  db.prepare(`
    UPDATE notification_delivery_attempts
    SET status = ?, http_status = ?, message = ?, finished_at = ?
    WHERE id = ?
  `).run(
    patch.status || existing.status,
    patch.httpStatus === undefined && patch.http_status === undefined ? existing.http_status : patch.httpStatus ?? patch.http_status,
    patch.message === undefined ? existing.message : patch.message,
    patch.finishedAt === undefined && patch.finished_at === undefined ? existing.finished_at : patch.finishedAt ?? patch.finished_at,
    attemptId
  );
  return getNotificationAttemptById(db, attemptId);
}

export function getNotificationAttemptById(db, attemptId) {
  const row = db.prepare(`
    SELECT notification_delivery_attempts.*, notification_channels.name AS channel_name, notification_channels.type AS channel_type
    FROM notification_delivery_attempts
    LEFT JOIN notification_channels ON notification_channels.id = notification_delivery_attempts.channel_id
    WHERE notification_delivery_attempts.id = ?
  `).get(Number(attemptId)) || null;
  return row ? parseNotificationAttemptRecord(row) : null;
}

export function listNotificationAttempts(db, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 50;
  return db.prepare(`
    SELECT notification_delivery_attempts.*, notification_channels.name AS channel_name, notification_channels.type AS channel_type
    FROM notification_delivery_attempts
    LEFT JOIN notification_channels ON notification_channels.id = notification_delivery_attempts.channel_id
    ORDER BY notification_delivery_attempts.created_at DESC, notification_delivery_attempts.id DESC
    LIMIT ?
  `).all(limit).map(parseNotificationAttemptRecord);
}

function parseDeploymentRecord(row) {
  return {
    ...row,
    host_port: row.host_port == null ? null : Number(row.host_port),
    container_port: row.container_port == null ? null : Number(row.container_port)
  };
}

function parseDomainRecord(row) {
  return {
    ...row,
    target_port: row.target_port == null ? null : Number(row.target_port)
  };
}

function parseProxyRouteRecord(row) {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    config: parseJsonObject(row.config)
  };
}

export function listDomains(db) {
  return db.prepare(`
    SELECT domains.*, apps.name AS app_name, apps.type AS app_type, apps.internal AS app_internal
    FROM domains
    JOIN apps ON apps.id = domains.app_id
    ORDER BY domains.hostname ASC
  `).all().map(parseDomainRecord);
}

export function listDomainsForApp(db, appId) {
  return db.prepare(`
    SELECT domains.*, apps.name AS app_name, apps.type AS app_type, apps.internal AS app_internal
    FROM domains
    JOIN apps ON apps.id = domains.app_id
    WHERE domains.app_id = ?
    ORDER BY domains.hostname ASC
  `).all(appId).map(parseDomainRecord);
}

export function getDomainByHostname(db, hostname) {
  const row = db.prepare(`
    SELECT domains.*, apps.name AS app_name, apps.type AS app_type, apps.internal AS app_internal
    FROM domains
    JOIN apps ON apps.id = domains.app_id
    WHERE domains.hostname = ?
  `).get(hostname) || null;
  return row ? parseDomainRecord(row) : null;
}

export function createDomain(db, input) {
  const hostname = String(input.hostname || "").trim().toLowerCase();
  const result = db.prepare(`
    INSERT INTO domains (app_id, hostname, status, dns_status, tls_status, target_port, verification_message)
    VALUES (?, ?, 'pending', 'pending', 'pending', ?, ?)
  `).run(input.appId, hostname, input.targetPort || null, input.verificationMessage || null);
  return getDomainByHostname(db, hostname) || db.prepare("SELECT * FROM domains WHERE id = ?").get(Number(result.lastInsertRowid));
}

export function deleteDomain(db, hostname) {
  const result = db.prepare("DELETE FROM domains WHERE hostname = ?").run(String(hostname || "").trim().toLowerCase());
  return result.changes > 0;
}

export function updateDomainVerification(db, hostname, input) {
  const existing = getDomainByHostname(db, hostname);
  if (!existing) return null;

  db.prepare(`
    UPDATE domains
    SET status = ?, dns_status = ?, tls_status = ?, target_port = ?, verification_message = ?, last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE hostname = ?
  `).run(
    input.status || existing.status,
    input.dnsStatus || existing.dns_status,
    input.tlsStatus || existing.tls_status,
    input.targetPort === undefined ? existing.target_port : input.targetPort,
    input.verificationMessage === undefined ? existing.verification_message : input.verificationMessage,
    existing.hostname
  );

  return getDomainByHostname(db, existing.hostname);
}

export function listProxyRoutes(db) {
  return db.prepare(`
    SELECT proxy_routes.*, domains.hostname, apps.name AS app_name
    FROM proxy_routes
    JOIN domains ON domains.id = proxy_routes.domain_id
    JOIN apps ON apps.id = proxy_routes.app_id
    ORDER BY domains.hostname ASC
  `).all().map(parseProxyRouteRecord);
}

function parseGithubInstallationRecord(row) {
  return {
    ...row,
    permissions: parseJsonObject(row.permissions),
    events: parseJsonArray(row.events)
  };
}

function parseGithubRepositoryRecord(row) {
  return {
    ...row,
    private: Boolean(row.private),
    auto_deploy_enabled: Boolean(row.auto_deploy_enabled)
  };
}

function parseGithubWebhookDeliveryRecord(row) {
  return {
    ...row,
    signature_valid: Boolean(row.signature_valid)
  };
}

export function listGithubInstallations(db) {
  return db.prepare("SELECT * FROM github_installations ORDER BY account_login ASC").all().map(parseGithubInstallationRecord);
}

export function upsertGithubInstallation(db, input) {
  const installationId = Number(input.installationId || input.installation_id);
  if (!Number.isInteger(installationId)) {
    throw new Error("GitHub installation_id is required.");
  }
  const accountLogin = String(input.accountLogin || input.account_login || "").trim();
  if (!accountLogin) {
    throw new Error("GitHub account login is required.");
  }

  db.prepare(`
    INSERT INTO github_installations (installation_id, account_login, account_type, app_id, target_type, permissions, events, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(installation_id) DO UPDATE SET
      account_login = excluded.account_login,
      account_type = excluded.account_type,
      app_id = excluded.app_id,
      target_type = excluded.target_type,
      permissions = excluded.permissions,
      events = excluded.events,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    installationId,
    accountLogin,
    input.accountType || input.account_type || null,
    input.appId || input.app_id || null,
    input.targetType || input.target_type || null,
    serializeJsonObject(input.permissions) || "{}",
    serializeJsonArray(input.events),
    input.status || "active"
  );

  return getGithubInstallationByInstallationId(db, installationId);
}

export function getGithubInstallationByInstallationId(db, installationId) {
  const row = db.prepare("SELECT * FROM github_installations WHERE installation_id = ?").get(Number(installationId)) || null;
  return row ? parseGithubInstallationRecord(row) : null;
}

export function listGithubRepositories(db) {
  return db.prepare(`
    SELECT github_repositories.*, apps.name AS connected_app_name
    FROM github_repositories
    LEFT JOIN apps ON apps.id = github_repositories.connected_app_id
    ORDER BY github_repositories.full_name ASC
  `).all().map(parseGithubRepositoryRecord);
}

export function getGithubRepositoryByFullName(db, fullName) {
  const row = db.prepare(`
    SELECT github_repositories.*, apps.name AS connected_app_name
    FROM github_repositories
    LEFT JOIN apps ON apps.id = github_repositories.connected_app_id
    WHERE github_repositories.full_name = ?
  `).get(String(fullName || "").trim()) || null;
  return row ? parseGithubRepositoryRecord(row) : null;
}

export function upsertGithubRepository(db, input) {
  const fullName = String(input.fullName || input.full_name || "").trim();
  if (!fullName || !fullName.includes("/")) {
    throw new Error("GitHub repository full_name must look like owner/name.");
  }
  const [owner, ...nameParts] = fullName.split("/");
  const name = String(input.name || nameParts.join("/")).trim();

  db.prepare(`
    INSERT INTO github_repositories (installation_id, github_repository_id, full_name, owner, name, private, default_branch, html_url, last_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(full_name) DO UPDATE SET
      installation_id = excluded.installation_id,
      github_repository_id = COALESCE(excluded.github_repository_id, github_repositories.github_repository_id),
      owner = excluded.owner,
      name = excluded.name,
      private = CASE WHEN excluded.private = 1 THEN 1 ELSE github_repositories.private END,
      default_branch = COALESCE(excluded.default_branch, github_repositories.default_branch),
      html_url = COALESCE(excluded.html_url, github_repositories.html_url),
      last_synced_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    input.installationId || input.installation_id || null,
    input.repositoryId || input.github_repository_id || null,
    fullName,
    owner,
    name,
    input.private ? 1 : 0,
    input.defaultBranch || input.default_branch || null,
    input.htmlUrl || input.html_url || null
  );

  return getGithubRepositoryByFullName(db, fullName);
}

export function connectAppToGithubRepository(db, appId, input) {
  const app = getAppById(db, appId);
  if (!app) return null;
  const repo = upsertGithubRepository(db, input);
  const branch = String(input.branch || repo.default_branch || "main").trim();
  const autoDeployEnabled = input.autoDeployEnabled ?? input.auto_deploy_enabled ?? true;

  const source = {
    ...(app.source || {}),
    type: "github",
    repo: repo.full_name,
    branch,
    auto_deploy: {
      enabled: Boolean(autoDeployEnabled),
      branches: [branch]
    }
  };

  db.prepare(`
    UPDATE apps
    SET source = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(serializeJsonObject(source), app.id);

  db.prepare(`
    INSERT INTO app_sources (app_id, source_type, repo, branch, path, dockerfile_path)
    VALUES (?, 'github', ?, ?, ?, ?)
    ON CONFLICT(app_id, source_type) DO UPDATE SET
      repo = excluded.repo,
      branch = excluded.branch,
      path = excluded.path,
      dockerfile_path = excluded.dockerfile_path,
      updated_at = CURRENT_TIMESTAMP
  `).run(app.id, repo.full_name, branch, input.path || app.path || null, input.dockerfilePath || input.dockerfile_path || null);

  db.prepare(`
    UPDATE github_repositories
    SET connected_app_id = ?, selected_branch = ?, auto_deploy_enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE full_name = ?
  `).run(app.id, branch, autoDeployEnabled ? 1 : 0, repo.full_name);

  return { app: getAppById(db, app.id), repository: getGithubRepositoryByFullName(db, repo.full_name) };
}

export function getGithubSourceForApp(db, appId) {
  const app = getAppById(db, appId);
  const sourceRow = db.prepare("SELECT * FROM app_sources WHERE app_id = ? AND source_type = 'github'").get(appId) || null;
  const repository = app?.source?.repo ? getGithubRepositoryByFullName(db, app.source.repo) : null;
  return { app, source: sourceRow, repository };
}

export function listGithubConnectedAppsForPush(db, push) {
  return listApps(db).filter((app) => {
    const source = app.source || {};
    const autoDeploy = source.auto_deploy || {};
    const branches = Array.isArray(autoDeploy.branches) && autoDeploy.branches.length > 0 ? autoDeploy.branches : [source.branch || "main"];
    return source.type === "github" && source.repo === push.repo && autoDeploy.enabled !== false && branches.includes(push.branch);
  });
}

export function recordGithubWebhookDelivery(db, input) {
  const deliveryId = String(input.deliveryId || input.delivery_id || "").trim();
  if (!deliveryId) {
    throw new Error("GitHub delivery ID is required.");
  }

  const result = db.prepare(`
    INSERT OR IGNORE INTO github_webhook_deliveries (delivery_id, event, action, status, signature_valid, repo, branch, commit_sha, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deliveryId,
    input.event || "unknown",
    input.action || null,
    input.status || "received",
    input.signatureValid ? 1 : 0,
    input.repo || null,
    input.branch || null,
    input.commitSha || null,
    input.message || null
  );

  return {
    inserted: result.changes > 0,
    delivery: getGithubWebhookDelivery(db, deliveryId)
  };
}

export function updateGithubWebhookDelivery(db, deliveryId, patch) {
  const existing = getGithubWebhookDelivery(db, deliveryId);
  if (!existing) return null;

  db.prepare(`
    UPDATE github_webhook_deliveries
    SET status = ?, action = ?, app_id = ?, deployment_id = ?, repo = ?, branch = ?, commit_sha = ?, message = ?, processed_at = COALESCE(?, processed_at), updated_at = CURRENT_TIMESTAMP
    WHERE delivery_id = ?
  `).run(
    patch.status || existing.status,
    patch.action === undefined ? existing.action : patch.action,
    patch.appId === undefined ? existing.app_id : patch.appId,
    patch.deploymentId === undefined ? existing.deployment_id : patch.deploymentId,
    patch.repo === undefined ? existing.repo : patch.repo,
    patch.branch === undefined ? existing.branch : patch.branch,
    patch.commitSha === undefined ? existing.commit_sha : patch.commitSha,
    patch.message === undefined ? existing.message : patch.message,
    patch.processedAt === undefined ? new Date().toISOString() : patch.processedAt,
    deliveryId
  );

  return getGithubWebhookDelivery(db, deliveryId);
}

export function getGithubWebhookDelivery(db, deliveryId) {
  const row = db.prepare("SELECT * FROM github_webhook_deliveries WHERE delivery_id = ?").get(String(deliveryId || "")) || null;
  return row ? parseGithubWebhookDeliveryRecord(row) : null;
}

export function listGithubWebhookDeliveries(db, options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 20;
  return db.prepare(`
    SELECT github_webhook_deliveries.*, apps.name AS app_name
    FROM github_webhook_deliveries
    LEFT JOIN apps ON apps.id = github_webhook_deliveries.app_id
    ORDER BY received_at DESC, delivery_id DESC
    LIMIT ?
  `).all(limit).map(parseGithubWebhookDeliveryRecord);
}

export function upsertProxyRoute(db, input) {
  const existing = db.prepare("SELECT id FROM proxy_routes WHERE domain_id = ?").get(input.domainId);
  const config = serializeJsonObject(input.config) || "{}";

  if (existing) {
    db.prepare(`
      UPDATE proxy_routes
      SET app_id = ?, deployment_id = ?, router_name = ?, service_name = ?, target_url = ?, config = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE domain_id = ?
    `).run(
      input.appId,
      input.deploymentId || null,
      input.routerName,
      input.serviceName,
      input.targetUrl,
      config,
      input.enabled === false ? 0 : 1,
      input.domainId
    );
  } else {
    db.prepare(`
      INSERT INTO proxy_routes (domain_id, app_id, deployment_id, router_name, service_name, target_url, config, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.domainId,
      input.appId,
      input.deploymentId || null,
      input.routerName,
      input.serviceName,
      input.targetUrl,
      config,
      input.enabled === false ? 0 : 1
    );
  }

  return listProxyRoutes(db).find((route) => route.domain_id === input.domainId) || null;
}

export function deleteProxyRouteForDomain(db, hostname) {
  const domain = getDomainByHostname(db, hostname);
  if (!domain) return false;
  const result = db.prepare("DELETE FROM proxy_routes WHERE domain_id = ?").run(domain.id);
  return result.changes > 0;
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
