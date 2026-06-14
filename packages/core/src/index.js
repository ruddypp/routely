export const routelyCoreVersion = "0.1.0";

export const DEFAULT_DASHBOARD_PORT = 3030;
export const DEFAULT_DAEMON_PORT = 9977;

export const APP_TYPES = ["app", "database", "compose", "static", "worker"];
export const APP_DRIVERS = ["command", "compose", "dockerfile", "buildpack", "static"];
export const APP_STATUSES = ["stopped", "running", "starting", "crashed", "unknown"];

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
    command: input.command || input.dev || null,
    port: input.port == null || input.port === "" ? null : Number(input.port),
    enabled: input.enabled == null ? true : Boolean(input.enabled),
    status: input.status || "stopped"
  };
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
    port: app.port,
    enabled: Boolean(app.enabled),
    status: app.status,
    createdAt: app.created_at,
    updatedAt: app.updated_at
  };
}
