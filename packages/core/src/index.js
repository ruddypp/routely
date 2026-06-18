export const routelyCoreVersion = "0.1.0";

export const DEFAULT_DASHBOARD_PORT = 3030;
export const DEFAULT_DAEMON_PORT = 9977;

export const APP_TYPES = ["app", "database", "compose", "static", "worker"];
export const APP_DRIVERS = ["command", "compose", "dockerfile", "buildpack", "static"];
export const APP_STATUSES = ["stopped", "running", "starting", "crashed", "unknown"];
export const DEPLOYMENT_STATUSES = ["queued", "preparing", "building", "starting", "healthchecking", "succeeded", "failed"];

const SECRET_ENV_PATTERN = /(SECRET|TOKEN|PASSWORD|PRIVATE|KEY)/i;
const REDACTED_VALUE = "[redacted]";

function enumValue(value, allowed, fallback, label) {
  const normalized = value || fallback;

  if (!allowed.includes(normalized)) {
    throw new Error(`Unsupported ${label}: ${normalized}`);
  }

  return normalized;
}

export function normalizeWorkspaceConfig(input = {}) {
  return {
    version: Number(input.version || 1),
    name: String(input.name || "routely-local"),
    dashboard: {
      port: Number(input.dashboard?.port || DEFAULT_DASHBOARD_PORT)
    },
    daemon: {
      port: Number(input.daemon?.port || DEFAULT_DAEMON_PORT)
    },
    apps: Array.isArray(input.apps) ? input.apps.map(normalizeAppInput) : [],
    services: Array.isArray(input.services) ? input.services.map(normalizeAppInput) : []
  };
}

export function normalizeAppInput(input) {
  const name = String(input.name || "").trim();

  if (!name) {
    throw new Error("App name is required.");
  }

  return {
    name,
    server_id: input.server_id == null ? 1 : Number(input.server_id),
    type: enumValue(input.type, APP_TYPES, "app", "app type"),
    preset: input.preset || "custom",
    driver: enumValue(input.driver, APP_DRIVERS, "command", "app driver"),
    path: input.path || null,
    command: input.command || input.dev || input.start || null,
    install: stringOrNull(input.install),
    dev: stringOrNull(input.dev || input.command),
    build: stringOrNull(input.build),
    start: stringOrNull(input.start),
    env: normalizeStringMap(input.env),
    port: input.port == null || input.port === "" ? null : Number(input.port),
    depends_on: normalizeDependsOn(input.depends_on),
    healthcheck: normalizeHealthcheck(input.healthcheck),
    domains: normalizeStringArray(input.domains),
    source: normalizeSource(input.source),
    image: stringOrNull(input.image),
    internal: input.internal == null ? false : Boolean(input.internal),
    volumes: normalizeStringArray(input.volumes),
    compose_file: stringOrNull(input.compose_file || input.composeFile),
    compose_service: stringOrNull(input.compose_service || input.composeService),
    enabled: input.enabled == null ? true : Boolean(input.enabled),
    status: input.status || "stopped"
  };
}

function stringOrNull(value) {
  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeStringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => String(key).trim())
      .map(([key, mapValue]) => [String(key).trim(), mapValue == null ? "" : String(mapValue)])
  );
}

function normalizeHealthcheck(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const normalized = {
    path: stringOrNull(value.path),
    expected_status:
      value.expected_status == null || value.expected_status === "" ? null : Number(value.expected_status)
  };

  return normalized.path || normalized.expected_status ? normalized : null;
}

function normalizeSource(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = {
    type: stringOrNull(value.type),
    repo: stringOrNull(value.repo),
    branch: stringOrNull(value.branch)
  };

  const autoDeploy = value.auto_deploy || value.autoDeploy;
  if (autoDeploy && typeof autoDeploy === "object" && !Array.isArray(autoDeploy)) {
    source.auto_deploy = {
      enabled: autoDeploy.enabled == null ? true : Boolean(autoDeploy.enabled),
      branches: normalizeStringArray(autoDeploy.branches)
    };
  }

  return source;
}

function normalizeStringArray(value) {
  if (value == null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDependsOn(value) {
  if (value == null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}

export function appToPublicDto(app) {
  return {
    id: app.id,
    serverId: app.server_id,
    name: app.name,
    type: app.type,
    preset: app.preset,
    driver: app.driver,
    path: app.path,
    command: app.command,
    install: app.install,
    dev: app.dev,
    build: app.build,
    start: app.start,
    env: app.env || {},
    port: app.port,
    dependsOn: Array.isArray(app.depends_on) ? app.depends_on : [],
    healthcheck: app.healthcheck || null,
    domains: app.domains || [],
    source: app.source || null,
    image: app.image || null,
    internal: Boolean(app.internal),
    volumes: app.volumes || [],
    composeFile: app.compose_file || null,
    composeService: app.compose_service || null,
    needsRestart: Boolean(app.needs_restart),
    needsRedeploy: Boolean(app.needs_redeploy),
    enabled: Boolean(app.enabled),
    status: app.status,
    createdAt: app.created_at,
    updatedAt: app.updated_at
  };
}

export function deploymentToPublicDto(deployment) {
  return {
    id: deployment.id,
    appId: deployment.app_id,
    appName: deployment.app_name || null,
    status: deployment.status,
    phase: deployment.phase || deployment.status,
    sourceType: deployment.source_type || null,
    repo: deployment.repo || null,
    branch: deployment.branch || null,
    commitSha: deployment.commit_sha || null,
    imageTag: deployment.image_tag || null,
    containerName: deployment.container_name || null,
    previousImageTag: deployment.previous_image_tag || null,
    previousContainerName: deployment.previous_container_name || null,
    hostPort: deployment.host_port == null ? null : Number(deployment.host_port),
    containerPort: deployment.container_port == null ? null : Number(deployment.container_port),
    errorMessage: deployment.error_message || null,
    startedAt: deployment.started_at || null,
    finishedAt: deployment.finished_at || null,
    createdAt: deployment.created_at,
    updatedAt: deployment.updated_at
  };
}

export function deploymentLogToPublicDto(log) {
  return {
    id: log.id,
    deploymentId: log.deployment_id,
    sequence: Number(log.sequence || 0),
    phase: log.phase,
    stream: log.stream || "system",
    message: log.message || "",
    createdAt: log.created_at
  };
}

export function isSecretEnvKey(key) {
  return SECRET_ENV_PATTERN.test(String(key || ""));
}

export function normalizeEnvKey(key) {
  const normalized = String(key || "").trim();
  if (!normalized) {
    throw new Error("Environment variable key is required.");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid environment variable key: ${normalized}. Use shell-style names like DATABASE_URL.`);
  }
  return normalized;
}

export function normalizeAppEnvInput(input = {}) {
  const key = normalizeEnvKey(input.key);
  return {
    key,
    value: input.value == null ? "" : String(input.value),
    isSecret: input.isSecret == null ? isSecretEnvKey(key) : Boolean(input.isSecret),
    scope: input.scope === "local" || input.scope === "production" ? input.scope : "all"
  };
}

export function appEnvVarToPublicDto(row) {
  return {
    id: row.id,
    appId: row.app_id,
    key: row.key,
    value: row.is_secret ? null : row.value,
    displayValue: row.is_secret ? REDACTED_VALUE : row.value,
    isSecret: Boolean(row.is_secret),
    scope: row.scope || "all",
    needsRestart: Boolean(row.needs_restart),
    needsRedeploy: Boolean(row.needs_redeploy),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mergeAppEnv(baseEnv = {}, storedEnvRows = [], options = {}) {
  const scope = options.scope || "all";
  const merged = { ...normalizeStringMap(baseEnv) };
  for (const row of storedEnvRows || []) {
    const rowScope = row.scope || "all";
    if (rowScope === "all" || scope === "all" || rowScope === scope) {
      merged[row.key] = row.value == null ? "" : String(row.value);
    }
  }
  return merged;
}

export function redactSecrets(value, secrets = []) {
  let output = String(value == null ? "" : value);
  const unique = [...new Set((secrets || []).map((secret) => String(secret || "")).filter((secret) => secret.length >= 3))];
  unique.sort((a, b) => b.length - a.length);
  for (const secret of unique) {
    output = output.split(secret).join(REDACTED_VALUE);
  }
  return output;
}

export function appToConfigEntry(input) {
  const app = normalizeAppInput(input);
  const entry = {
    name: app.name,
    type: app.type,
    preset: app.preset,
    driver: app.driver
  };

  setIfPresent(entry, "path", app.path);
  setIfPresent(entry, "install", app.install);
  setIfPresent(entry, "dev", app.dev);
  setIfPresent(entry, "build", app.build);
  setIfPresent(entry, "start", app.start);
  setIfPresent(entry, "command", app.command && app.command !== app.dev ? app.command : null);
  setIfPresent(entry, "port", app.port);
  if (Object.keys(app.env).length > 0) {
    entry.env = filterExportableEnv(app.env);
  }
  if (app.depends_on.length > 0) entry.depends_on = app.depends_on;
  setIfPresent(entry, "healthcheck", app.healthcheck);
  if (app.domains.length > 0) entry.domains = app.domains;
  setIfPresent(entry, "source", app.source);
  setIfPresent(entry, "image", app.image);
  if (app.internal) entry.internal = true;
  if (app.volumes.length > 0) entry.volumes = app.volumes;
  setIfPresent(entry, "compose_file", app.compose_file);
  setIfPresent(entry, "compose_service", app.compose_service);
  if (!app.enabled) entry.enabled = false;

  return entry;
}

function setIfPresent(target, key, value) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return;
  }

  target[key] = value;
}

export function filterExportableEnv(env = {}) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !SECRET_ENV_PATTERN.test(key))
  );
}

export {
  WORKSPACE_CONFIG_FILENAMES,
  resolveWorkspaceConfigPath,
  loadWorkspaceConfig,
  readRawWorkspaceConfig,
  upsertWorkspaceConfigEntry
} from "./config.js";

export {
  SERVER_MODE_LOCAL,
  SERVER_MODE_PRODUCTION,
  DEFAULT_PRODUCTION_PORTS,
  defaultProductionDataDir,
  generateAdminToken,
  hashAdminToken,
  verifyAdminToken,
  runServerDoctorChecks
} from "./server-foundation.js";
