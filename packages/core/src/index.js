export const routelyCoreVersion = "0.1.0";

export const DEFAULT_DASHBOARD_PORT = 3030;
export const DEFAULT_DAEMON_PORT = 9977;

export const APP_TYPES = ["app", "database", "compose", "static", "worker"];
export const APP_DRIVERS = ["command", "compose", "dockerfile", "buildpack", "static"];
export const APP_STATUSES = ["stopped", "running", "starting", "crashed", "unknown"];
export const DEPLOYMENT_STATUSES = ["queued", "preparing", "building", "starting", "healthchecking", "succeeded", "failed"];
export const DATABASE_TYPES = ["postgres", "mysql", "mariadb", "redis", "mongodb"];
export const BACKUP_RUN_STATUSES = ["queued", "running", "succeeded", "failed", "pruned"];
export const NOTIFICATION_CHANNEL_TYPES = ["webhook", "discord", "telegram"];
export const NOTIFICATION_EVENTS = ["deploy_succeeded", "deploy_failed", "backup_failed"];

const SECRET_ENV_PATTERN = /(SECRET|TOKEN|PASSWORD|PRIVATE|KEY)/i;
const EXPLICIT_SECRET_ENV_KEYS = new Set([
  "DATABASE_URL",
  "REDIS_URL",
  "MONGODB_URI",
  "POSTGRES_URL",
  "POSTGRESQL_URL",
  "MYSQL_URL",
  "MARIADB_URL",
  "SENTRY_DSN",
  "WEBHOOK_URL"
]);
const PUBLIC_ENV_PREFIX_PATTERN = /^(NEXT_PUBLIC_|PUBLIC_|VITE_)/i;
const PUBLIC_URL_ENV_KEYS = new Set(["APP_URL", "BASE_URL", "CANONICAL_URL", "HEALTHCHECK_URL", "PUBLIC_URL", "ROOT_URL", "SITE_URL"]);
const SECRET_URL_ENV_PROVIDER_PATTERN = /(^|_)(DATABASE|DB|POSTGRES|POSTGRESQL|PG|MYSQL|MARIADB|REDIS|MONGO|MONGODB|SENTRY|WEBHOOK|DISCORD|SLACK|TELEGRAM|STRIPE|SUPABASE|NEON|PLANETSCALE|TURSO|PRISMA|AMQP|RABBITMQ|KAFKA|ELASTIC|ELASTICSEARCH|OPENSEARCH|MEILISEARCH|CLICKHOUSE|UPSTASH|QSTASH|SMTP|MAIL|MAILGUN|SENDGRID|TWILIO|AWS|GCP|AZURE|OPENAI|ANTHROPIC|HUGGINGFACE|PINECONE|ALGOLIA|CLOUDFLARE|DOCKER|REGISTRY)(_|$)/i;
const REDACTED_VALUE = "[redacted]";
const APP_INPUT_KEYS = new Set([
  "id",
  "server_id",
  "serverId",
  "name",
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
  "envKeys",
  "port",
  "ports",
  "depends_on",
  "dependsOn",
  "healthcheck",
  "domains",
  "source",
  "auto_deploy",
  "autoDeploy",
  "image",
  "internal",
  "volumes",
  "compose_file",
  "composeFile",
  "compose_service",
  "composeService",
  "needs_restart",
  "needsRestart",
  "needs_redeploy",
  "needsRedeploy",
  "enabled",
  "status",
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt"
]);

export class DependencyCycleError extends Error {
  constructor(cycle) {
    super(`Dependency cycle detected: ${cycle.join(" -> ")}`);
    this.name = "DependencyCycleError";
    this.cycle = cycle;
  }
}

export function sortByDependencies(items) {
  const byName = new Map(items.map((item) => [item.name, item]));
  const permanent = new Set();
  const temporary = new Set();
  const stack = [];
  const sorted = [];

  function visit(item) {
    if (permanent.has(item.name)) {
      return;
    }

    if (temporary.has(item.name)) {
      const cycleStart = stack.indexOf(item.name);
      throw new DependencyCycleError([...stack.slice(cycleStart), item.name]);
    }

    temporary.add(item.name);
    stack.push(item.name);

    for (const dependencyName of normalizeDependencies(item.depends_on ?? item.dependsOn)) {
      const dependency = byName.get(dependencyName);
      if (dependency) {
        visit(dependency);
      }
    }

    stack.pop();
    temporary.delete(item.name);
    permanent.add(item.name);
    sorted.push(item);
  }

  for (const item of items) {
    visit(item);
  }

  return sorted;
}

export function selectBulkStartApps(items) {
  return sortByDependencies(
    items.filter((item) => item.enabled !== false && (item.driver === "command" || item.driver === "compose"))
  );
}

function normalizeDependencies(value) {
  if (value == null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}

function enumValue(value, allowed, fallback, label) {
  const normalized = value || fallback;

  if (!allowed.includes(normalized)) {
    throw new Error(`Unsupported ${label}: ${normalized}`);
  }

  return normalized;
}

function redactUrlSecret(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.username) url.username = REDACTED_VALUE;
    if (url.password) url.password = REDACTED_VALUE;
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_ENV_PATTERN.test(key) || /token|signature|key|secret/i.test(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
      }
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length > 2 && /webhook|bot|api/i.test(url.hostname + url.pathname)) {
      url.pathname = `/${parts.slice(0, -1).join("/")}/${REDACTED_VALUE}`;
    }
    return url.toString();
  } catch {
    return text.length <= 8 ? REDACTED_VALUE : `${text.slice(0, 4)}...${REDACTED_VALUE}`;
  }
}

export function normalizeNotificationChannelInput(input = {}) {
  const type = enumValue(String(input.type || input.channelType || "").trim().toLowerCase(), NOTIFICATION_CHANNEL_TYPES, "webhook", "notification channel type");
  const name = String(input.name || type).trim();
  if (!name) throw new Error("Notification channel name is required.");
  const events = normalizeStringArray(input.events || input.subscribedEvents || NOTIFICATION_EVENTS).filter((event) => NOTIFICATION_EVENTS.includes(event));
  if (events.length === 0) throw new Error("At least one supported notification event is required.");

  const config = input.config && typeof input.config === "object" && !Array.isArray(input.config) ? { ...input.config } : {};
  if (input.url != null) config.url = String(input.url);
  if (input.webhookUrl != null) config.url = String(input.webhookUrl);
  if (input.botToken != null) config.botToken = String(input.botToken);
  if (input.chatId != null) config.chatId = String(input.chatId);

  if ((type === "webhook" || type === "discord") && !config.url) {
    throw new Error(`${type} notification channel requires a webhook URL.`);
  }
  if (type === "telegram" && (!config.botToken || !config.chatId)) {
    throw new Error("Telegram notification channel requires botToken and chatId.");
  }

  return {
    name,
    type,
    enabled: input.enabled == null ? true : Boolean(input.enabled),
    events,
    config
  };
}

export function notificationChannelToPublicDto(row) {
  const config = row.config && typeof row.config === "object" ? row.config : {};
  const target = row.type === "telegram"
    ? `telegram:${config.chatId ? String(config.chatId).replace(/.(?=.{4})/g, "*") : REDACTED_VALUE}`
    : redactUrlSecret(config.url);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    enabled: Boolean(row.enabled),
    events: Array.isArray(row.events) ? row.events : [],
    target,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function notificationAttemptToPublicDto(row) {
  return {
    id: row.id,
    channelId: row.channel_id,
    channelName: row.channel_name || null,
    channelType: row.channel_type || null,
    event: row.event,
    status: row.status,
    httpStatus: row.http_status == null ? null : Number(row.http_status),
    message: row.message || null,
    target: row.target || null,
    resourceType: row.resource_type || null,
    resourceId: row.resource_id == null ? null : Number(row.resource_id),
    createdAt: row.created_at,
    finishedAt: row.finished_at || null
  };
}

export function buildNotificationMessage(event, context = {}) {
  const appName = context.appName || context.app?.name || "app";
  if (event === "deploy_succeeded") return `Routely deploy succeeded for ${appName}.`;
  if (event === "deploy_failed") return `Routely deploy failed for ${appName}: ${context.errorMessage || "see deployment logs"}.`;
  if (event === "backup_failed") return `Routely backup failed for ${context.databaseName || "database"}: ${context.errorMessage || "see backup runs"}.`;
  return `Routely event: ${event}.`;
}

export function buildNotificationPayload(channel, event, context = {}) {
  const message = buildNotificationMessage(event, context);
  const payload = {
    source: "routely",
    event,
    message,
    app: context.appName || null,
    deploymentId: context.deploymentId || null,
    backupRunId: context.backupRunId || null,
    database: context.databaseName || null,
    status: event.endsWith("failed") ? "failed" : "succeeded",
    occurredAt: context.occurredAt || new Date().toISOString()
  };

  if (channel.type === "discord") {
    return { content: message, embeds: [{ title: message, color: event.endsWith("failed") ? 15158332 : 3066993 }] };
  }
  if (channel.type === "telegram") {
    return { chat_id: channel.config.chatId, text: message, disable_web_page_preview: true };
  }
  return payload;
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
    services: Array.isArray(input.services) ? input.services.map(normalizeServiceInput) : []
  };
}

function normalizeServiceInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || input.type) {
    return normalizeAppInput(input);
  }

  return normalizeAppInput({ ...input, type: inferServiceType(input) });
}

function inferServiceType(input) {
  const preset = String(input.preset || "").trim().toLowerCase();
  const name = String(input.name || "").trim().toLowerCase();

  if (DATABASE_TYPES.includes(preset) || DATABASE_TYPES.includes(name)) {
    return "database";
  }

  return "compose";
}

export function normalizeAppInput(input) {
  assertSupportedAppInputFields(input);
  const name = String(input.name || "").trim();

  if (!name) {
    throw new Error("App name is required.");
  }

  const ports = normalizePorts(input.port, input.ports);
  const port = input.port == null || input.port === "" ? ports[0] ?? null : normalizePort(input.port);

  return {
    name,
    server_id: (input.server_id ?? input.serverId) == null ? 1 : Number(input.server_id ?? input.serverId),
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
    port,
    ports,
    depends_on: normalizeDependsOn(input.depends_on ?? input.dependsOn),
    healthcheck: normalizeHealthcheck(input.healthcheck),
    domains: normalizeStringArray(input.domains),
    source: normalizeSource(input.source, input.auto_deploy ?? input.autoDeploy),
    image: stringOrNull(input.image),
    internal: input.internal == null ? false : Boolean(input.internal),
    volumes: normalizeStringArray(input.volumes),
    compose_file: stringOrNull(input.compose_file || input.composeFile),
    compose_service: stringOrNull(input.compose_service || input.composeService),
    enabled: input.enabled == null ? true : Boolean(input.enabled),
    status: input.status || "stopped"
  };
}

function assertSupportedAppInputFields(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return;
  }

  const unsupported = Object.keys(input).filter((key) => !APP_INPUT_KEYS.has(key));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported app field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}`);
  }
}

function stringOrNull(value) {
  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function normalizePort(value) {
  if (value == null || value === "") {
    return null;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${value}. Use a positive integer port number.`);
  }
  return port;
}

function normalizePorts(port, ports) {
  const values = [];

  if (port != null && port !== "") {
    values.push(port);
  }

  if (ports != null && ports !== "") {
    if (Array.isArray(ports)) {
      values.push(...ports);
    } else if (typeof ports === "string") {
      values.push(...ports.split(","));
    } else {
      values.push(ports);
    }
  }

  const normalized = [];
  for (const value of values) {
    const normalizedPort = normalizePort(value);
    if (normalizedPort != null && !normalized.includes(normalizedPort)) {
      normalized.push(normalizedPort);
    }
  }

  return normalized;
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

  const expectedStatus = value.expected_status ?? value.expectedStatus;
  const normalized = {
    path: stringOrNull(value.path),
    expected_status: expectedStatus == null || expectedStatus === "" ? null : Number(expectedStatus)
  };

  return normalized.path || normalized.expected_status ? normalized : null;
}

function normalizeSource(value, autoDeployInput) {
  const hasSource = value && typeof value === "object" && !Array.isArray(value);
  const autoDeploy = autoDeployInput ?? (hasSource ? value.auto_deploy ?? value.autoDeploy : null);

  if (!hasSource && !autoDeploy) {
    return null;
  }

  const source = {
    type: stringOrNull(hasSource ? value.type : null),
    repo: stringOrNull(hasSource ? value.repo : null),
    branch: stringOrNull(hasSource ? value.branch : null)
  };

  const subdirectory = stringOrNull(hasSource ? value.subdirectory : null);
  if (subdirectory) {
    source.subdirectory = subdirectory;
  }

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
  const env = app.env || {};
  const shouldRedactEnv = app.type === "database" || app.internal === true || app.internal === 1;
  const publicEnv = shouldRedactEnv ? {} : filterExportableEnv(env);
  const ports = Array.isArray(app.ports) && app.ports.length > 0 ? app.ports : app.port ? [app.port] : [];
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
    env: publicEnv,
    envKeys: Object.keys(env).sort(),
    port: app.port,
    ports,
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
  const logsUrl = `/deployments/${deployment.id}/logs`;
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
    logsUrl,
    logsStreamUrl: `/deployments/${deployment.id}/logs/stream`,
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

export function healthcheckToPublicDto(row) {
  const status = row.last_status || "unknown";
  return {
    id: row.id,
    appId: row.app_id,
    deploymentId: row.deployment_id == null ? null : Number(row.deployment_id),
    target: row.target || "runtime",
    path: row.path || null,
    expectedStatus: row.expected_status == null ? null : Number(row.expected_status),
    status,
    available: status !== "unknown" && status !== "unavailable",
    httpStatus: row.last_http_status == null ? null : Number(row.last_http_status),
    responseTimeMs: row.last_response_time_ms == null ? null : Number(row.last_response_time_ms),
    message: row.last_message || null,
    checkedAt: row.last_checked_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function healthSummaryToPublicDto(checks = [], options = {}) {
  const publicChecks = (checks || []).map((check) => healthcheckToPublicDto(check));
  const latest = publicChecks[0] || null;
  const status = latest?.status || "unknown";
  const available = latest ? latest.available : false;
  const reason = latest
    ? status === "unavailable" || status === "unknown" ? status : null
    : options.reason || "unavailable";

  return {
    status,
    available,
    reason,
    message: latest?.message || options.message || "No healthcheck results recorded yet.",
    checkedAt: latest?.checkedAt || null,
    checks: publicChecks
  };
}

export function metricSampleToPublicDto(row) {
  return {
    id: row.id,
    appId: row.app_id == null ? null : Number(row.app_id),
    deploymentId: row.deployment_id == null ? null : Number(row.deployment_id),
    scope: row.scope || "host",
    cpuPercent: row.cpu_percent == null ? null : Number(row.cpu_percent),
    memoryBytes: row.memory_bytes == null ? null : Number(row.memory_bytes),
    memoryLimitBytes: row.memory_limit_bytes == null ? null : Number(row.memory_limit_bytes),
    diskUsedBytes: row.disk_used_bytes == null ? null : Number(row.disk_used_bytes),
    diskTotalBytes: row.disk_total_bytes == null ? null : Number(row.disk_total_bytes),
    networkRxBytes: row.network_rx_bytes == null ? null : Number(row.network_rx_bytes),
    networkTxBytes: row.network_tx_bytes == null ? null : Number(row.network_tx_bytes),
    message: row.message || null,
    sampledAt: row.sampled_at
  };
}

export function databaseToPublicDto(row) {
  const env = row.env && typeof row.env === "object" ? row.env : {};
  const internal = Boolean(row.internal);
  return {
    id: row.id,
    appId: row.app_id,
    appName: row.app_name || null,
    name: row.name,
    type: row.type,
    status: row.status || "stopped",
    internal,
    connectionScope: internal ? "internal-only" : "public-requested",
    image: row.image || null,
    port: row.port == null ? null : Number(row.port),
    composeService: row.compose_service || null,
    composeFile: row.compose_file || null,
    volumeName: row.volume_name || null,
    envKeys: Object.keys(env).sort(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function backupJobToPublicDto(row) {
  const retentionDays = Number(row.retention_days || 7);
  return {
    id: row.id,
    databaseId: row.database_id,
    databaseName: row.database_name || null,
    databaseType: row.database_type || null,
    enabled: Boolean(row.enabled),
    schedule: row.schedule || null,
    retentionDays,
    retentionStatus: retentionDays > 0 ? "local-prune-after-success" : "disabled",
    storageType: "local",
    storageStatus: "metadata-only",
    restoreStatus: "deferred",
    storage: {
      type: "local",
      class: "local-metadata",
      external: false,
      servesFiles: false
    },
    retention: {
      days: retentionDays,
      mode: "local-successful-runs",
      prunesAfterSuccessfulBackup: true,
      externalStorage: false,
      restoreSupported: false
    },
    lastRunStatus: row.last_run_status || null,
    lastRunAt: row.last_run_at || null,
    lastRunMessage: redactDatabaseMessage(row.last_run_message, row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function backupRunToPublicDto(row) {
  const filePath = row.file_path || null;
  const sizeBytes = row.size_bytes == null ? null : Number(row.size_bytes);
  const fileName = filePath ? filePath.split(/[\\/]/).filter(Boolean).at(-1) || null : null;
  const fileAvailable = row.status === "succeeded" && Boolean(fileName);
  return {
    id: row.id,
    backupJobId: row.backup_job_id,
    databaseId: row.database_id,
    databaseName: row.database_name || null,
    databaseType: row.database_type || null,
    status: row.status,
    trigger: row.trigger || "manual",
    storageType: "local",
    storageStatus: "metadata-only",
    restoreStatus: "deferred",
    downloadUrl: null,
    fileName,
    file: {
      available: fileAvailable,
      name: fileName,
      sizeBytes,
      servesFile: false,
      downloadUrl: null
    },
    sizeBytes,
    message: redactDatabaseMessage(row.message, row),
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function redactDatabaseMessage(message, row) {
  if (!message) return null;
  let env = row.database_env && typeof row.database_env === "object" ? row.database_env : {};
  if (typeof row.database_env === "string") {
    try {
      env = JSON.parse(row.database_env);
    } catch {
      env = {};
    }
  }
  return redactSecrets(message, Object.values(env));
}

export function normalizeDatabaseType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (!DATABASE_TYPES.includes(normalized)) {
    throw new Error(`Unsupported database type: ${normalized || "missing"}.`);
  }
  return normalized;
}

export function normalizeBackupSchedule(schedule) {
  const value = String(schedule || "").trim();
  if (!value) return null;
  if (value === "@hourly" || value === "@daily") return value;
  const parts = value.split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("Backup schedule must be @hourly, @daily, or a five-field cron expression.");
  }
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  parts.forEach((part, index) => validateCronField(part, ranges[index][0], ranges[index][1]));
  return parts.join(" ");
}

function validateCronField(value, min, max) {
  for (const item of String(value).split(",")) {
    const atom = item.includes("/") ? item.split("/")[0] : item;
    const step = item.includes("/") ? Number(item.split("/")[1]) : null;
    if (step != null && (!Number.isInteger(step) || step <= 0)) {
      throw new Error(`Invalid cron step: ${item}.`);
    }
    if (atom === "*") continue;
    if (/^\d+$/.test(atom)) {
      const number = Number(atom);
      if (number < min || number > max) throw new Error(`Cron value ${number} is outside ${min}-${max}.`);
      continue;
    }
    const range = atom.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end || start < min || end > max) throw new Error(`Invalid cron range: ${atom}.`);
      continue;
    }
    throw new Error(`Invalid cron field: ${item}.`);
  }
}

export function backupScheduleDue(schedule, now = new Date(), lastRunAt = null) {
  const normalized = normalizeBackupSchedule(schedule);
  if (!normalized) return false;
  if (lastRunAt && now.getTime() - new Date(lastRunAt).getTime() < 55_000) return false;
  if (normalized === "@hourly") return now.getUTCMinutes() === 0;
  if (normalized === "@daily") return now.getUTCHours() === 2 && now.getUTCMinutes() === 0;
  const [minute, hour, day, month, weekday] = normalized.split(" ");
  const cronWeekday = now.getUTCDay();
  return cronFieldMatches(minute, now.getUTCMinutes())
    && cronFieldMatches(hour, now.getUTCHours())
    && cronFieldMatches(day, now.getUTCDate())
    && cronFieldMatches(month, now.getUTCMonth() + 1)
    && (cronFieldMatches(weekday, cronWeekday) || (cronWeekday === 0 && cronFieldMatches(weekday, 7)));
}

function cronFieldMatches(field, value) {
  return String(field).split(",").some((item) => {
    const [atom, stepValue] = item.split("/");
    const step = stepValue ? Number(stepValue) : null;
    if (step && value % step !== 0) return false;
    if (atom === "*") return true;
    if (/^\d+$/.test(atom)) return Number(atom) === value;
    const range = atom.match(/^(\d+)-(\d+)$/);
    return range ? value >= Number(range[1]) && value <= Number(range[2]) : false;
  });
}

export function selectBackupRunsForRetention(runs = [], retentionDays = 7, now = new Date()) {
  const cutoff = now.getTime() - Math.max(1, Number(retentionDays || 7)) * 24 * 60 * 60 * 1000;
  return (runs || []).filter((run) => {
    const filePath = run.file_path || run.filePath;
    if (run.status !== "succeeded" || !filePath) return false;
    const finishedAt = run.finished_at || run.finishedAt || run.updated_at || run.updatedAt;
    return finishedAt ? new Date(finishedAt).getTime() < cutoff : false;
  });
}

export function evaluateHttpHealthcheck(input = {}) {
  const expectedStatus = input.expectedStatus == null ? 200 : Number(input.expectedStatus);
  const httpStatus = input.httpStatus == null ? null : Number(input.httpStatus);
  const responseTimeMs = input.responseTimeMs == null ? null : Number(input.responseTimeMs);

  if (input.error) {
    return {
      status: "unhealthy",
      httpStatus,
      responseTimeMs,
      message: String(input.error)
    };
  }

  if (httpStatus === expectedStatus) {
    return {
      status: "healthy",
      httpStatus,
      responseTimeMs,
      message: `HTTP ${httpStatus} in ${responseTimeMs ?? 0}ms`
    };
  }

  return {
    status: "unhealthy",
    httpStatus,
    responseTimeMs,
    message: `HTTP ${httpStatus ?? "unreachable"}, expected ${expectedStatus}`
  };
}

export function evaluateRuntimeHealth(input = {}) {
  if (input.available === false) {
    return { status: "unavailable", message: input.message || "runtime health is unavailable" };
  }

  if (input.running) {
    return { status: "healthy", message: input.message || "runtime is running" };
  }

  return { status: "unhealthy", message: input.message || "runtime is not running" };
}

export function formatSseEvent(event, data, options = {}) {
  const lines = [];
  if (options.id != null) lines.push(`id: ${String(options.id)}`);
  if (event) lines.push(`event: ${String(event)}`);
  const payload = typeof data === "string" ? data : JSON.stringify(data ?? {});
  for (const line of payload.split(/\r?\n/)) {
    lines.push(`data: ${line}`);
  }
  lines.push("", "");
  return lines.join("\n");
}

export function isSecretEnvKey(key) {
  const normalized = String(key || "").trim().toUpperCase();
  if (!normalized) return false;
  if (SECRET_ENV_PATTERN.test(normalized) || EXPLICIT_SECRET_ENV_KEYS.has(normalized)) return true;
  if (PUBLIC_ENV_PREFIX_PATTERN.test(normalized) || PUBLIC_URL_ENV_KEYS.has(normalized)) return false;
  if (/(^|_)(DSN|URI)$/.test(normalized)) return true;
  return /(^|_)URL$/.test(normalized) && SECRET_URL_ENV_PROVIDER_PATTERN.test(normalized);
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
  const inferredSecret = isSecretEnvKey(key);
  return {
    key,
    value: input.value == null ? "" : String(input.value),
    isSecret: inferredSecret || Boolean(input.isSecret),
    scope: input.scope === "local" || input.scope === "production" ? input.scope : "all"
  };
}

export function appEnvVarToPublicDto(row) {
  const secret = Boolean(row.is_secret) || isSecretEnvKey(row.key);
  return {
    id: row.id,
    appId: row.app_id,
    key: row.key,
    value: secret ? null : row.value,
    displayValue: secret ? REDACTED_VALUE : row.value,
    isSecret: secret,
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
  if (app.ports.length > 1) entry.ports = app.ports;
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
  entry.enabled = app.enabled;

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
    Object.entries(env).filter(([key]) => !isSecretEnvKey(key))
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
