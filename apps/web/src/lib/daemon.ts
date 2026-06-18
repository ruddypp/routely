/**
 * Server-side helpers for talking to the Routely daemon.
 *
 * The dashboard never calls the daemon from the browser; these helpers run in
 * Next.js Route Handlers (the `/api/*` surface defined in docs/06-api-spec.md),
 * which proxy to the daemon. This keeps the daemon bound to 127.0.0.1 and gives
 * the browser a same-origin API.
 */

export const DAEMON_URL = process.env.ROUTELY_DAEMON_URL || "http://127.0.0.1:9977";

export type DaemonApp = {
  id: number;
  serverId: number;
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string | null;
  command: string | null;
  install: string | null;
  dev: string | null;
  build: string | null;
  start: string | null;
  env: Record<string, string>;
  port: number | null;
  dependsOn?: string[];
  healthcheck?: { path: string | null; expected_status: number | null } | null;
  domains?: string[];
  source?: { type: string | null; repo: string | null; branch: string | null } | null;
  image?: string | null;
  internal?: boolean;
  volumes?: string[];
  composeFile?: string | null;
  composeService?: string | null;
  enabled: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DaemonAppLifecycleResponse = {
  app: DaemonApp;
  pid?: number | null;
  stopped?: Array<{ pid: number; result: string }>;
};

export type DaemonAppLogsResponse = {
  app: DaemonApp;
  logs: string;
  path: string;
  bytes: number;
  truncated: boolean;
};

export type DaemonAppEnvVar = {
  id: number;
  appId: number;
  key: string;
  value: string | null;
  displayValue: string;
  isSecret: boolean;
  scope: string;
  needsRestart: boolean;
  needsRedeploy: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DaemonAppEnvResponse = {
  app: DaemonApp;
  env: {
    vars: DaemonAppEnvVar[];
    pending: { count: number; needsRestart: boolean; needsRedeploy: boolean };
  };
  envVar?: DaemonAppEnvVar;
};

export type DaemonDeployment = {
  id: number;
  appId: number;
  appName: string | null;
  status: "queued" | "preparing" | "building" | "starting" | "healthchecking" | "succeeded" | "failed" | string;
  phase: string;
  sourceType: string | null;
  repo: string | null;
  branch: string | null;
  commitSha: string | null;
  imageTag: string | null;
  containerName: string | null;
  previousImageTag: string | null;
  previousContainerName: string | null;
  hostPort: number | null;
  containerPort: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DaemonDeploymentLog = {
  id: number;
  deploymentId: number;
  sequence: number;
  phase: string;
  stream: string;
  message: string;
  createdAt: string;
};

export type DaemonDeploymentLogsResponse = {
  deployment: DaemonDeployment;
  logs: DaemonDeploymentLog[];
};

export type DaemonHealthcheck = {
  id: number;
  appId: number;
  deploymentId: number | null;
  target: string;
  path: string | null;
  expectedStatus: number | null;
  status: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  message: string | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DaemonMetricSample = {
  id: number;
  appId: number | null;
  deploymentId: number | null;
  scope: string;
  cpuPercent: number | null;
  memoryBytes: number | null;
  memoryLimitBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  message: string | null;
  sampledAt: string;
};

export type DaemonDatabase = {
  id: number;
  appId: number | null;
  appName: string | null;
  name: string;
  type: string;
  status: string;
  internal: boolean;
  image: string | null;
  port: number | null;
  composeService: string | null;
  composeFile: string | null;
  volumeName: string | null;
  envKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type DaemonBackupJob = {
  id: number;
  databaseId: number;
  databaseName: string | null;
  databaseType: string | null;
  enabled: boolean;
  schedule: string | null;
  retentionDays: number;
  localDir: string | null;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  lastRunMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DaemonBackupRun = {
  id: number;
  backupJobId: number;
  databaseId: number;
  databaseName: string | null;
  databaseType: string | null;
  status: string;
  trigger: string;
  filePath: string | null;
  sizeBytes: number | null;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DaemonAppHealthResponse = {
  app: DaemonApp;
  latestDeployment: DaemonDeployment | null;
  health: { status: string; checks: DaemonHealthcheck[] };
  healthcheck?: DaemonHealthcheck;
};

export type DaemonAppMetricsResponse = {
  app: DaemonApp;
  metrics: DaemonMetricSample[];
};

export type DaemonDomain = {
  id: number;
  appId: number;
  appName: string | null;
  hostname: string;
  status: string;
  dnsStatus: string;
  tlsStatus: string;
  targetPort: number | null;
  verificationMessage: string | null;
  lastVerifiedAt: string | null;
  appType?: string | null;
  appInternal?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DaemonProxyRoute = {
  id: number;
  domainId: number;
  appId: number;
  appName: string | null;
  deploymentId: number | null;
  hostname: string;
  routerName: string;
  serviceName: string;
  targetUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DaemonGithubInstallation = {
  id: number;
  installationId: number;
  accountLogin: string;
  accountType: string | null;
  appId: string | null;
  targetType: string | null;
  permissions: Record<string, unknown>;
  events: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DaemonGithubRepository = {
  id: number;
  installationId: number | null;
  repositoryId: number | null;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string | null;
  htmlUrl: string | null;
  connectedAppId: number | null;
  connectedAppName: string | null;
  selectedBranch: string | null;
  autoDeployEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DaemonGithubDelivery = {
  deliveryId: string;
  event: string;
  action: string | null;
  status: string;
  signatureValid: boolean;
  appId: number | null;
  appName: string | null;
  deploymentId: number | null;
  repo: string | null;
  branch: string | null;
  commitSha: string | null;
  message: string | null;
  receivedAt: string;
  processedAt: string | null;
  updatedAt: string;
};

export type DaemonGithubStatusResponse = {
  github: {
    configured: boolean;
    appId: string | null;
    clientId: string | null;
    webhookSecretConfigured: boolean;
    privateKeyConfigured: boolean;
    installations: DaemonGithubInstallation[];
    repositories: DaemonGithubRepository[];
    deliveries: DaemonGithubDelivery[];
  };
};

export type DaemonHealth = {
  ok: boolean;
  service: string;
  version: string;
  workspace?: string;
  database?: string;
  startedAt?: string;
  server?: DaemonServerStatus;
  apps?: DaemonApp[];
};

export type DaemonServerCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  message: string;
  detail: string | null;
};

export type DaemonServerStatus = {
  mode: "local" | "production" | string;
  production: boolean;
  dataDir: string | null;
  initializedAt: string | null;
  auth: {
    required: boolean;
    configured: boolean;
    tokenCreatedAt: string | null;
    tokenSource: string | null;
  };
  readiness: {
    ok: boolean;
    checkedAt: string | null;
    checks: DaemonServerCheck[];
  } | null;
  disabledProductionActions: string[];
};

export type DaemonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

/**
 * Fetch a daemon endpoint with a short timeout. Network/timeout failures are
 * returned as a structured error rather than thrown, so Route Handlers can map
 * them to a clean 503 instead of a stack trace.
 */
export async function daemonFetch<T>(path: string, init?: RequestInit): Promise<DaemonResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  const adminToken = process.env.ROUTELY_ADMIN_TOKEN;

  try {
    const headers = {
      ...(init?.body == null ? {} : { "content-type": "application/json" }),
      ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}),
      ...(init?.headers || {})
    };
    const response = await fetch(`${DAEMON_URL}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      const error =
        (data as { error?: string })?.error || `Daemon responded with HTTP ${response.status}`;
      return { ok: false, status: response.status, error };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const reason = isAbort
      ? "Routely daemon did not respond in time."
      : "Could not reach the Routely daemon. Is it running?";
    return { ok: false, status: 503, error: reason };
  } finally {
    clearTimeout(timeout);
  }
}

export function daemonProxyResponse<T>(result: DaemonResult<T>, fallback?: T) {
  if (!result.ok) {
    return Response.json(fallback ? { ...fallback, error: result.error } : { error: result.error }, {
      status: result.status
    });
  }

  return Response.json(result.data, { status: result.status });
}
