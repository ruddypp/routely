export type OperationDeployment = {
  id: number;
  status: string;
  phase: string;
  logsUrl?: string | null;
  logsStreamUrl?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type OperationDomain = {
  dnsStatus?: string | null;
  proxyStatus?: string | null;
  tlsStatus?: string | null;
  targetPort?: number | null;
  targetUrl?: string | null;
};

export type OperationEnvVar = {
  displayValue?: string | null;
  isSecret: boolean;
  value?: string | null;
};

export type OperationLogState = {
  bytes?: number | null;
  path?: string | null;
  truncated?: boolean | null;
};

export type OperationServerState = {
  auth?: {
    required: boolean;
    configured: boolean;
  } | null;
} | null;

export type OperationDatabase = {
  internal?: boolean;
  connectionScope?: string | null;
};

export type OperationBackupJob = {
  storageType?: string | null;
  storageStatus?: string | null;
  restoreStatus?: string | null;
  storage?: { type?: string | null; servesFiles?: boolean | null } | null;
};

export type OperationBackupRun = OperationBackupJob & {
  status: string;
  filePath?: string | null;
  fileName?: string | null;
  downloadUrl?: string | null;
  file?: {
    available?: boolean | null;
    name?: string | null;
    servesFile?: boolean | null;
    downloadUrl?: string | null;
  } | null;
};

export type OperationStateLabel = {
  label: string;
  tone: "ok" | "warn" | "error";
  detail?: string | null;
};

const ACTIVE_DEPLOYMENT_STATUSES = new Set(["queued", "preparing", "building", "starting", "healthchecking", "running"]);
const FAILED_STATUSES = new Set(["failed", "error", "invalid"]);
const REDACTED_MARKERS = ["redacted", "***", "•••", "[hidden]", "[secret]"];

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isMissingAuthError(error: string | null | undefined): boolean {
  return Boolean(error && /admin token|requires.*auth|unauthorized/i.test(error));
}

export function productionAuthState(server: OperationServerState, errors: Array<string | null | undefined> = []): OperationStateLabel {
  const authError = errors.find(isMissingAuthError) || null;
  if (authError) return { label: "missing auth", tone: "error", detail: authError };
  if (!server?.auth) return { label: "unavailable", tone: "warn", detail: "Server status is unavailable." };
  if (!server.auth.required) return { label: "local bypass", tone: "ok" };
  return server.auth.configured
    ? { label: "ready", tone: "ok" }
    : { label: "missing auth", tone: "error", detail: "Production APIs require an admin token." };
}

export function isDeploymentInProgress(deployment: OperationDeployment | null | undefined): boolean {
  return Boolean(deployment && ACTIVE_DEPLOYMENT_STATUSES.has(deployment.status));
}

export function latestSuccessfulDeployment<T extends OperationDeployment>(deployments: T[]): T | null {
  return deployments
    .filter((deployment) => deployment.status === "succeeded")
    .sort((a, b) => timestamp(b.finishedAt || b.updatedAt || b.createdAt) - timestamp(a.finishedAt || a.updatedAt || a.createdAt))[0] || null;
}

export function deploymentStateLabel(deployment: OperationDeployment | null | undefined): string {
  if (!deployment) return "no deployment recorded";
  if (isDeploymentInProgress(deployment)) return `deploy in progress: ${deployment.phase || deployment.status}`;
  if (deployment.status === "failed") return `failed phase: ${deployment.phase || "unknown"}`;
  if (deployment.status === "succeeded") return `latest successful deployment #${deployment.id}`;
  return `${deployment.status}${deployment.phase && deployment.phase !== deployment.status ? ` phase: ${deployment.phase}` : ""}`;
}

export function deploymentLogsLabel(deployment: OperationDeployment | null | undefined): string {
  if (!deployment) return "deployment logs unavailable";
  return deployment.logsUrl || deployment.logsStreamUrl ? "deployment logs available" : "deployment logs unavailable";
}

export function domainDnsLabel(status: string | null | undefined): string {
  if (!status) return "DNS unknown";
  if (status === "verified") return "DNS verified";
  if (status === "pending") return "DNS pending";
  if (status === "not-configured") return "DNS not configured";
  if (["failed", "error", "mismatch", "invalid"].includes(status)) return "DNS mismatch";
  return `DNS ${status}`;
}

export function domainProxyLabel(domain: OperationDomain, routeEnabled: boolean): string {
  const status = domain.proxyStatus || (routeEnabled ? "generated" : "pending");
  if (status === "generated") return "generated route";
  if (status === "not-configured") return "proxy not configured";
  if (FAILED_STATUSES.has(status)) return "proxy failed";
  return "proxy pending";
}

export function domainTlsLabel(status: string | null | undefined): string {
  if (!status) return "TLS unknown";
  if (["active", "verified"].includes(status)) return "verified TLS";
  if (["issuing", "pending"].includes(status)) return "pending TLS";
  if (status === "not-configured") return "TLS not configured";
  if (FAILED_STATUSES.has(status)) return "failed TLS";
  return `TLS ${status}`;
}

export function domainTargetLabel(domain: OperationDomain): string {
  return domain.targetUrl || (domain.targetPort ? `:${domain.targetPort}` : "target pending");
}

export function safeEnvDisplay(row: OperationEnvVar): string {
  if (!row.isSecret) return row.displayValue ?? row.value ?? "";

  const display = row.displayValue || "[redacted]";
  const normalized = display.toLowerCase();
  const isRedacted = REDACTED_MARKERS.some((marker) => normalized.includes(marker));
  return isRedacted ? display : "[redacted]";
}

export function envVisibilityLabel(row: OperationEnvVar): string {
  return row.isSecret ? "secret metadata" : "plain value";
}

export function logAvailabilityLabel(logs: OperationLogState | null | undefined): string {
  if (!logs) return "logs not loaded";
  if (logs.bytes === 0) return "logs available: empty";
  if (logs.path) return logs.truncated ? "logs available: truncated tail" : "logs available";
  return "logs unavailable";
}

export function databaseExposureLabel(database: OperationDatabase): OperationStateLabel {
  if (database.connectionScope === "internal-only" || database.internal) return { label: "internal-only", tone: "ok" };
  return { label: database.connectionScope || "public requested", tone: "error" };
}

export function backupStorageLabel(job: OperationBackupJob): OperationStateLabel {
  const type = job.storageType || job.storage?.type || "local";
  const status = job.storageStatus || "metadata-only";
  return { label: `${type} · ${status}`, tone: job.storage?.servesFiles ? "error" : "ok" };
}

export function backupRestoreLabel(job: OperationBackupJob): OperationStateLabel {
  const status = job.restoreStatus || "deferred";
  return { label: status === "deferred" ? "restore deferred" : status, tone: status === "deferred" ? "warn" : "ok" };
}

export function backupRunFileState(run: OperationBackupRun): OperationStateLabel {
  if (run.downloadUrl || run.file?.downloadUrl || run.file?.servesFile) {
    return { label: "download exposed", tone: "error" };
  }
  if (run.file?.available || run.filePath) {
    return { label: run.fileName || run.file?.name || "local file recorded", tone: "ok" };
  }
  if (run.status === "failed") return { label: "no backup file", tone: "error" };
  if (ACTIVE_DEPLOYMENT_STATUSES.has(run.status)) return { label: "backup running", tone: "warn" };
  return { label: run.storageStatus || "metadata-only", tone: "warn" };
}
